-- Referral programme: invite links, a first-order discount for the invited friend, and account credit for the
-- person who invited them. Credit is spent as a discount on book orders and is paid for by the platform
-- (order_items.platform_discount), so authors' royalties never change.
-- Everything starts switched off with zero amounts. An admin turns it on and sets the amounts in Admin → Referrals.

-- ---------------------------------------------------------------------------
-- 1. Settings (amounts in whole rupees)
-- ---------------------------------------------------------------------------
insert into public.settings (key, value, description) values (
  'referrals',
  jsonb_build_object(
    'enabled', false,                    -- master switch
    'reader_enabled', false,             -- a reader invites a friend
    'reader_friend_discount', 0,         -- off the friend's first order
    'reader_referrer_credit', 0,         -- credit for the reader who invited
    'author_enabled', false,             -- an author's link brings a new customer
    'author_buyer_discount', 0,
    'author_credit', 0,
    'author_author_enabled', false,      -- an invited person publishes their first book
    'author_author_credit', 0,           -- for each of the two
    'min_order', 0,                      -- books value needed for the first-order discount and reward
    'monthly_cap', 0,                    -- most credit one person can earn in a month (0 = no limit)
    'credit_expiry_days', 180,
    'reward_wait_days', 7,               -- days after delivery before the reward is given
    'max_credit_percent', 50             -- most of an order's books value that credit can pay
  ),
  'Referral programme. Off by default; amounts in rupees. Edited in Admin → Referrals.'
) on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Invite codes, who invited whom, rewards
-- ---------------------------------------------------------------------------
create table public.referral_codes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z0-9]{6,10}$'),
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
create policy "referral codes: owner reads" on public.referral_codes for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- One row per invited account, created when a new account finishes setting up after opening an invite link
create table public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid references public.profiles (id) on delete set null,
  referred_id    uuid not null unique references public.profiles (id) on delete cascade,
  code           text not null,
  referrer_kind  text not null check (referrer_kind in ('reader', 'author')),  -- which programme, as it was at sign-up
  status         text not null default 'active' check (status in ('active', 'blocked')),
  blocked_reason text check (length(blocked_reason) <= 300),
  created_at     timestamptz not null default now(),
  check (referrer_id is null or referrer_id <> referred_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id, created_at desc);
alter table public.referrals enable row level security;
create policy "referrals: people involved read" on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

create table public.referral_rewards (
  id              uuid primary key default gen_random_uuid(),
  referral_id     uuid not null references public.referrals (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,  -- who gets the credit
  reason          text not null check (reason in ('friend_first_order', 'author_first_book')),
  order_id        uuid references public.orders (id) on delete set null,
  book_id         uuid references public.books (id) on delete set null,
  amount          numeric(10, 2) not null check (amount >= 0),
  status          text not null check (status in ('granted', 'cancelled')),
  note            text check (length(note) <= 300),  -- e.g. why it was cancelled
  created_at      timestamptz not null default now(),
  cancelled_at    timestamptz,
  unique (referral_id, user_id, reason)
);
create index referral_rewards_user_idx on public.referral_rewards (user_id, created_at desc);
create index referral_rewards_order_idx on public.referral_rewards (order_id);
alter table public.referral_rewards enable row level security;
create policy "referral rewards: owner reads" on public.referral_rewards for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Credit ledger: every change to someone's credit. Positive rows expire; spending uses the oldest credit first.
-- ---------------------------------------------------------------------------
create table public.credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount <> 0),
  kind       text not null check (kind in ('reward', 'spend', 'return', 'adjust', 'clawback')),
  expires_at timestamptz,  -- positive rows only
  order_id   uuid references public.orders (id) on delete set null,
  reward_id  uuid references public.referral_rewards (id) on delete set null,
  note       text check (length(note) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  check (case when amount > 0 then kind in ('reward', 'return', 'adjust') and expires_at is not null
              else kind in ('spend', 'clawback', 'adjust') and expires_at is null end)
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at);
-- Each order spends credit once and gets it back once; each reward is given and taken back once
create unique index credit_ledger_one_spend on public.credit_ledger (order_id) where kind = 'spend';
create unique index credit_ledger_one_return on public.credit_ledger (order_id) where kind = 'return';
create unique index credit_ledger_one_reward on public.credit_ledger (reward_id) where kind = 'reward';
create unique index credit_ledger_one_clawback on public.credit_ledger (reward_id) where kind = 'clawback';
alter table public.credit_ledger enable row level security;
create policy "credit ledger: owner reads" on public.credit_ledger for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- What a book order took off the price, both paid for by the platform
alter table public.orders
  add column referral_discount numeric(10, 2) not null default 0 check (referral_discount >= 0),
  add column credit_used numeric(10, 2) not null default 0 check (credit_used >= 0),
  add column referral_id uuid references public.referrals (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Balance: replays the ledger in time order. A spend uses credit that hadn't expired at that moment,
--    soonest-expiring first. Anything taken back beyond the balance is owed and comes off later credit.
-- ---------------------------------------------------------------------------
create function public.credit_balance(p_user uuid, out balance numeric, out next_expiry timestamptz, out expiring numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  e record;
  amounts numeric[] := '{}';
  expiries timestamptz[] := '{}';
  owed numeric := 0;
  need numeric;
  take numeric;
  pick int;
  i int;
begin
  for e in select amount, expires_at, created_at from public.credit_ledger where user_id = p_user order by created_at, id loop
    if e.amount > 0 then
      take := least(owed, e.amount);
      owed := owed - take;
      amounts := amounts || (e.amount - take);
      expiries := expiries || e.expires_at;
    else
      need := -e.amount;
      while need > 0 loop
        pick := null;
        for i in 1 .. coalesce(array_length(amounts, 1), 0) loop
          if amounts[i] > 0 and expiries[i] > e.created_at and (pick is null or expiries[i] < expiries[pick]) then pick := i; end if;
        end loop;
        exit when pick is null;
        take := least(need, amounts[pick]);
        amounts[pick] := amounts[pick] - take;
        need := need - take;
      end loop;
      owed := owed + need;
    end if;
  end loop;

  balance := 0;
  for i in 1 .. coalesce(array_length(amounts, 1), 0) loop
    if amounts[i] > 0 and expiries[i] > now() then
      balance := balance + amounts[i];
      if next_expiry is null or expiries[i] < next_expiry then next_expiry := expiries[i]; end if;
    end if;
  end loop;
  balance := round(balance - owed, 2);
  expiring := 0;
  if next_expiry is not null then
    for i in 1 .. coalesce(array_length(amounts, 1), 0) loop
      if amounts[i] > 0 and expiries[i] = next_expiry then expiring := expiring + amounts[i]; end if;
    end loop;
  end if;
end $$;

-- Spend credit on an order, under a per-person lock so two checkouts can't spend the same credit
create function public.spend_credit(p_user uuid, p_order uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  perform pg_advisory_xact_lock(hashtext('eliphas.credit:' || p_user::text));
  if (select balance from public.credit_balance(p_user)) < p_amount then raise exception 'INSUFFICIENT_CREDIT'; end if;
  insert into public.credit_ledger (user_id, amount, kind, order_id, note) values (p_user, -p_amount, 'spend', p_order, 'Used on an order');
end $$;

-- Give a referral reward as credit, within the person's monthly limit (calendar month, India time).
-- Returns 'granted', 'capped' (limit reached: recorded as cancelled) or 'exists'.
create function public.grant_referral_reward(
  p_referral uuid, p_user uuid, p_reason text, p_amount numeric, p_cap numeric, p_expiry_days int, p_order uuid default null, p_book uuid default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  earned numeric;
  amount numeric := p_amount;
  reward_id uuid;
begin
  if p_amount is null or p_amount <= 0 or p_expiry_days is null or p_expiry_days < 1 then raise exception 'Invalid reward'; end if;
  perform pg_advisory_xact_lock(hashtext('eliphas.credit:' || p_user::text));
  if exists (select 1 from public.referral_rewards where referral_id = p_referral and user_id = p_user and reason = p_reason) then return 'exists'; end if;
  if coalesce(p_cap, 0) > 0 then
    select coalesce(sum(r.amount), 0) into earned from public.referral_rewards r
     where r.user_id = p_user and r.status = 'granted'
       and r.created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata');
    amount := least(p_amount, greatest(p_cap - earned, 0));
  end if;
  if amount <= 0 then
    insert into public.referral_rewards (referral_id, user_id, reason, order_id, book_id, amount, status, note, cancelled_at)
    values (p_referral, p_user, p_reason, p_order, p_book, 0, 'cancelled', 'Monthly limit reached', now());
    return 'capped';
  end if;
  insert into public.referral_rewards (referral_id, user_id, reason, order_id, book_id, amount, status)
  values (p_referral, p_user, p_reason, p_order, p_book, amount, 'granted') returning id into reward_id;
  insert into public.credit_ledger (user_id, amount, kind, expires_at, reward_id, order_id, note)
  values (p_user, amount, 'reward', now() + make_interval(days => p_expiry_days), reward_id, p_order,
          case p_reason when 'friend_first_order' then 'Invite reward' else 'Author invite reward' end);
  return 'granted';
end $$;

-- Take back a granted reward (admin, or automatically when its order is refunded)
create function public.cancel_referral_reward(p_reward uuid, p_actor uuid, p_note text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r public.referral_rewards;
begin
  select * into r from public.referral_rewards where id = p_reward for update;
  if r.id is null or r.status <> 'granted' then return false; end if;
  update public.referral_rewards set status = 'cancelled', note = left(p_note, 300), cancelled_at = now() where id = p_reward;
  if r.amount > 0 then
    insert into public.credit_ledger (user_id, amount, kind, reward_id, note, created_by)
    values (r.user_id, -r.amount, 'clawback', r.id, left(coalesce(p_note, 'Reward cancelled'), 300), p_actor)
    on conflict do nothing;
  end if;
  return true;
end $$;

-- Admin correction: add credit (expires like any other) or remove it
create function public.adjust_credit(p_user uuid, p_amount numeric, p_note text, p_actor uuid, p_expiry_days int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000 then raise exception 'Invalid amount'; end if;
  if length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'Add a short note'; end if;
  perform pg_advisory_xact_lock(hashtext('eliphas.credit:' || p_user::text));
  insert into public.credit_ledger (user_id, amount, kind, expires_at, note, created_by)
  values (p_user, p_amount, 'adjust', case when p_amount > 0 then now() + make_interval(days => greatest(coalesce(p_expiry_days, 180), 1)) end,
          left(btrim(p_note), 300), p_actor);
end $$;

-- When an order is cancelled or refunded: its credit comes back, and any reward it earned is taken back.
-- A trigger, so every path (buyer, admin, unpaid checkout, problem refund) is covered.
create function public.orders_credit_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  days int;
  r record;
begin
  if (new.status = 'cancelled' and old.status <> 'cancelled') or (new.refund_status is not null and old.refund_status is null) then
    if new.credit_used > 0 and exists (select 1 from public.credit_ledger where order_id = new.id and kind = 'spend') then
      select coalesce((value ->> 'credit_expiry_days')::int, 180) into days from public.settings where key = 'referrals';
      insert into public.credit_ledger (user_id, amount, kind, expires_at, order_id, note)
      select l.user_id, -l.amount, 'return', now() + make_interval(days => greatest(coalesce(days, 180), 1)), new.id, 'Order cancelled or refunded'
        from public.credit_ledger l where l.order_id = new.id and l.kind = 'spend'
      on conflict do nothing;
    end if;
    for r in select id from public.referral_rewards where order_id = new.id and status = 'granted' loop
      perform public.cancel_referral_reward(r.id, null, 'The order was cancelled or refunded');
    end loop;
  end if;
  return new;
end $$;

create trigger orders_credit_on_cancel after update of status, refund_status on public.orders
  for each row execute function public.orders_credit_on_cancel();

revoke execute on function public.credit_balance(uuid) from public, anon, authenticated;
revoke execute on function public.spend_credit(uuid, uuid, numeric) from public, anon, authenticated;
revoke execute on function public.grant_referral_reward(uuid, uuid, text, numeric, numeric, int, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_referral_reward(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.adjust_credit(uuid, numeric, text, uuid, int) from public, anon, authenticated;
revoke execute on function public.orders_credit_on_cancel() from public, anon, authenticated;
grant execute on function public.credit_balance(uuid) to service_role;
grant execute on function public.spend_credit(uuid, uuid, numeric) to service_role;
grant execute on function public.grant_referral_reward(uuid, uuid, text, numeric, numeric, int, uuid, uuid) to service_role;
grant execute on function public.cancel_referral_reward(uuid, uuid, text) to service_role;
grant execute on function public.adjust_credit(uuid, numeric, text, uuid, int) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Finance report: platform-paid discounts (invite discounts and credit) and credit still unspent
-- ---------------------------------------------------------------------------
create or replace function public.admin_finance(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  with lines as (
    select oi.*
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where o.paid_at >= p_from and o.paid_at < p_to and public.is_earning_status(o.status) and oi.reversed_at is null
  ), ord as (
    select * from public.orders o
    where o.paid_at >= p_from and o.paid_at < p_to and o.status <> 'pending_payment'
  )
  select jsonb_build_object(
    'book_sales_value', coalesce((select sum(unit_price * quantity) from lines), 0),
    'print_costs',      coalesce((select sum(coalesce(print_cost_total, print_cost * quantity)) from lines), 0),
    'commission',       coalesce((select sum(coalesce(commission, platform_fee * quantity)) from lines), 0),
    'commission_gst',   coalesce((select sum(coalesce(commission_gst, 0)) from lines), 0),
    'gateway_costs',    coalesce((select sum(coalesce(gateway_allocated, payment_fee * quantity)) from lines), 0),
    'author_earnings',  coalesce((select sum(public.line_earning(l::public.order_items)) from lines l), 0),
    'platform_discounts', coalesce((select sum(platform_discount) from lines), 0),
    'shipping_collected', coalesce((select sum(shipping) from ord where public.is_earning_status(status)), 0),
    'shipping_promotions', coalesce((select sum(shipping_discount) from ord where public.is_earning_status(status)), 0),
    'book_refunds',     coalesce((select sum(refund_amount) from ord where refund_status in ('processed', 'pending')), 0),
    'service_revenue',  coalesce((select sum(base_paise) from public.payments where purpose = 'service' and status in ('paid', 'partially_refunded') and paid_at >= p_from and paid_at < p_to), 0) / 100.0,
    'service_gst',      coalesce((select sum(gst_paise) from public.payments where purpose = 'service' and status in ('paid', 'partially_refunded') and paid_at >= p_from and paid_at < p_to), 0) / 100.0,
    'subscription_revenue', coalesce((select sum(base_paise) from public.payments where purpose = 'subscription' and status in ('paid', 'partially_refunded') and paid_at >= p_from and paid_at < p_to), 0) / 100.0,
    'subscription_gst', coalesce((select sum(gst_paise) from public.payments where purpose = 'subscription' and status in ('paid', 'partially_refunded') and paid_at >= p_from and paid_at < p_to), 0) / 100.0,
    'other_refunds',    coalesce((select sum(refunded_paise) from public.payments where refunded_at >= p_from and refunded_at < p_to), 0) / 100.0,
    'author_liability', coalesce((select sum(greatest(balance, 0)) from public.author_balances), 0)
  ) into result;
  return result;
end $$;
