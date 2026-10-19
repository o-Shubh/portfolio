-- Operations before launch: parcel tracking links, order update emails (with a delivery log),
-- the contact form inbox and author payout runs. Nothing here sends anything by itself.

-- ---------------------------------------------------------------------------
-- 1. Tracking link the printer pastes from the courier's receipt (optional)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column tracking_url text check (tracking_url is null or (tracking_url like 'https://%' and length(tracking_url) <= 500));

-- ---------------------------------------------------------------------------
-- 2. Order update emails
-- ---------------------------------------------------------------------------
-- Optional email for order updates. Login stays by phone (or Google).
alter table public.profiles
  add column email text check (email is null or (length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column notify_order_emails boolean not null default true;
-- The address an order's updates go to, as entered at checkout
alter table public.orders
  add column contact_email text check (contact_email is null or (length(contact_email) <= 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));

-- Every email the app tries to send. dedupe_key makes each update send once (e.g. "order:<id>:shipped").
create table public.email_outbox (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'refund_processed', 'contact_message')),
  to_email     text not null check (length(to_email) <= 254),
  subject      text not null check (length(subject) <= 200),
  html         text not null,
  text_body    text not null,
  dedupe_key   text unique,
  status       text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  attempts     integer not null default 0,
  last_error   text check (length(last_error) <= 1000),
  provider_id  text,
  user_id      uuid references public.profiles (id) on delete set null,
  order_id     uuid references public.orders (id) on delete set null,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index email_outbox_retry_idx on public.email_outbox (status, created_at) where status in ('queued', 'failed');
create index email_outbox_recent_idx on public.email_outbox (created_at desc);
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;
grant select on public.email_outbox to authenticated;
create policy "email outbox: admin reads" on public.email_outbox for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Contact form inbox (guests and members). Written by the server only.
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 2 and 80),
  email        text not null check (length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone        text check (length(phone) <= 20),
  topic        text not null check (topic in ('order', 'publishing', 'payout', 'services', 'other')),
  order_number text check (length(order_number) <= 40),
  message      text not null check (length(btrim(message)) between 10 and 4000),
  user_id      uuid references public.profiles (id) on delete set null,
  ip_hash      text,                         -- salted hash, only for rate limiting
  status       text not null default 'new' check (status in ('new', 'replied', 'closed')),
  admin_note   text check (length(admin_note) <= 2000),
  handled_by   uuid references public.profiles (id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index contact_messages_inbox_idx on public.contact_messages (status, created_at desc);
create index contact_messages_rate_idx on public.contact_messages (ip_hash, created_at);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
create policy "contact messages: admin reads" on public.contact_messages for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Author payout runs: everyone owed, in one batch, paid by bank/UPI and marked paid with the UTR
-- ---------------------------------------------------------------------------
create table public.payout_runs (
  id           uuid primary key default gen_random_uuid(),
  status       text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  minimum      numeric(10, 2) not null default 0 check (minimum >= 0),
  total        numeric(12, 2) not null default 0,
  authors      integer not null default 0,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create unique index payout_runs_one_open on public.payout_runs ((true)) where status = 'open';
alter table public.payout_runs enable row level security;
create policy "payout runs: admin" on public.payout_runs for all using (public.is_admin()) with check (public.is_admin());

alter table public.payouts
  add column run_id uuid references public.payout_runs (id),
  add column upi text;  -- the UPI ID used for this payout, as it was when the run started

-- What an author can be paid now: earnings on delivered orders, minus paid and still-pending payouts
create function public.payable_now(p_author uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select greatest(0,
    coalesce((select sum(public.line_earning(oi)) from public.order_items oi join public.orders o on o.id = oi.order_id
              where oi.author_id = p_author and o.status = 'delivered'), 0)
    - coalesce((select sum(amount) from public.payouts where author_id = p_author and status in ('paid', 'pending')), 0)
  )::numeric(12, 2)
$$;

-- Start a run: one pending payout per author owed at least p_minimum who has a UPI ID. One open run at a time.
create function public.create_payout_run(p_minimum numeric, p_actor uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  run_id uuid;
begin
  if p_minimum is null or p_minimum < 0 then raise exception 'Invalid minimum'; end if;
  perform pg_advisory_xact_lock(hashtext('eliphas.payout_run'));
  if exists (select 1 from public.payout_runs where status = 'open') then
    raise exception 'Finish or cancel the open payout run first';
  end if;
  insert into public.payout_runs (minimum, created_by) values (p_minimum, p_actor) returning id into run_id;
  insert into public.payouts (author_id, amount, status, run_id, upi, created_by, note)
  select p.id, public.payable_now(p.id), 'pending', run_id, p.payout_upi, p_actor, 'Payout run'
    from public.profiles p
   where p.payout_upi is not null and btrim(p.payout_upi) <> ''
     and public.payable_now(p.id) >= greatest(p_minimum, 0.01);
  update public.payout_runs r
     set total = coalesce((select sum(amount) from public.payouts where payouts.run_id = r.id), 0),
         authors = (select count(*) from public.payouts where payouts.run_id = r.id)
   where r.id = run_id;
  return run_id;
end $$;

-- Mark one payout in an open run paid (with the bank/UPI reference) or cancelled. Closes the run when nothing is pending.
create function public.settle_run_payout(p_payout uuid, p_paid boolean, p_reference text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pay public.payouts;
begin
  select * into pay from public.payouts where id = p_payout for update;
  if pay.id is null or pay.run_id is null or pay.status <> 'pending' then raise exception 'This payout is not waiting in a run'; end if;
  if p_paid and length(btrim(coalesce(p_reference, ''))) < 4 then raise exception 'Enter the payment reference (UTR)'; end if;
  update public.payouts
     set status = case when p_paid then 'paid'::public.payout_status else 'cancelled'::public.payout_status end,
         reference = case when p_paid then btrim(p_reference) else reference end,
         paid_at = case when p_paid then now() else null end
   where id = p_payout;
  if not exists (select 1 from public.payouts where run_id = pay.run_id and status = 'pending') then
    update public.payout_runs set status = 'completed', closed_at = now() where id = pay.run_id and status = 'open';
  end if;
end $$;

-- Cancel an open run: its pending payouts are released (already-paid ones stay paid)
create function public.cancel_payout_run(p_run uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payouts set status = 'cancelled' where run_id = p_run and status = 'pending';
  update public.payout_runs set status = 'cancelled', closed_at = now() where id = p_run and status = 'open';
end $$;

revoke execute on function public.payable_now(uuid) from public, anon, authenticated;
revoke execute on function public.create_payout_run(numeric, uuid) from public, anon, authenticated;
revoke execute on function public.settle_run_payout(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.cancel_payout_run(uuid) from public, anon, authenticated;
grant execute on function public.payable_now(uuid) to service_role;
grant execute on function public.create_payout_run(numeric, uuid) to service_role;
grant execute on function public.settle_run_payout(uuid, boolean, text) to service_role;
grant execute on function public.cancel_payout_run(uuid) to service_role;
