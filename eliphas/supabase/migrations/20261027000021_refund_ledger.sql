-- Refund ledger for Pro and service payments, and safer book-order refunds.
-- Before: a payment was marked "refunded" as soon as Razorpay accepted the request, even if the refund later failed,
-- and two quick clicks could start two refunds. Now every refund is a row: the amount is reserved atomically before
-- Razorpay is called, and the payment's refunded total changes only when Razorpay confirms the refund.

create table public.payment_refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments (id),
  amount_paise       integer not null check (amount_paise > 0),
  status             text not null default 'requested' check (status in ('requested', 'pending', 'processed', 'failed')),
  razorpay_refund_id text unique,
  reason             text not null default '' check (length(reason) <= 500),
  error              text check (length(error) <= 1000),
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  processed_at       timestamptz
);
create index payment_refunds_payment_idx on public.payment_refunds (payment_id);
create index payment_refunds_open_idx on public.payment_refunds (status) where status <> 'processed';
create trigger payment_refunds_touch before update on public.payment_refunds
  for each row execute function public.touch_updated_at();

alter table public.payment_refunds enable row level security;
revoke all on public.payment_refunds from anon, authenticated;
grant select on public.payment_refunds to authenticated;
create policy "payment refunds: admin reads" on public.payment_refunds for select to authenticated using (public.is_admin());

-- Reserve a refund. Locks the payment so concurrent refunds can't exceed what was paid.
-- Failed attempts don't count. Pass p_retry to reopen a failed attempt instead of creating a new one.
create function public.begin_payment_refund(p_payment uuid, p_amount integer, p_reason text, p_actor uuid, p_retry uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pay public.payments;
  reserved integer;
  refund_row uuid;
begin
  select * into pay from public.payments where id = p_payment for update;
  if pay.id is null then raise exception 'Payment not found'; end if;
  if pay.status not in ('paid', 'partially_refunded', 'refunded') then raise exception 'Only paid payments can be refunded'; end if;
  -- Reserved = refunds made before this ledger existed (refunded_paise not explained by processed rows)
  --          + every attempt that hasn't failed
  select (pay.refunded_paise - coalesce(sum(amount_paise) filter (where status = 'processed'), 0))
         + coalesce(sum(amount_paise) filter (where status <> 'failed' and id is distinct from p_retry), 0)
    into reserved
    from public.payment_refunds where payment_id = p_payment;
  if p_amount is null or p_amount <= 0 or reserved + p_amount > pay.amount_paise then
    raise exception 'Refund exceeds the amount left (% paise)', pay.amount_paise - reserved;
  end if;
  if p_retry is not null then
    update public.payment_refunds set status = 'requested', error = null
     where id = p_retry and payment_id = p_payment and status = 'failed' and amount_paise = p_amount
    returning id into refund_row;
    if refund_row is null then raise exception 'Only a failed refund can be retried'; end if;
    return refund_row;
  end if;
  insert into public.payment_refunds (payment_id, amount_paise, reason, created_by)
  values (p_payment, p_amount, left(coalesce(p_reason, ''), 500), p_actor)
  returning id into refund_row;
  return refund_row;
end $$;

-- Record Razorpay's answer. The payment's refunded total moves only on the first change to "processed".
create function public.settle_payment_refund(p_refund uuid, p_status text, p_razorpay_id text default null, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.payment_refunds;
begin
  if p_status not in ('pending', 'processed', 'failed') then raise exception 'Invalid refund status'; end if;
  select * into r from public.payment_refunds where id = p_refund for update;
  if r.id is null then raise exception 'Refund not found'; end if;
  if r.status = 'processed' then return; end if;  -- already final; later events change nothing
  update public.payment_refunds
     set status = p_status,
         razorpay_refund_id = coalesce(p_razorpay_id, razorpay_refund_id),
         error = case when p_status = 'failed' then left(p_error, 1000) else null end,
         processed_at = case when p_status = 'processed' then now() else null end
   where id = r.id;
  if p_status = 'processed' then
    update public.payments
       set refunded_paise = refunded_paise + r.amount_paise,
           status = case when refunded_paise + r.amount_paise >= amount_paise then 'refunded' else 'partially_refunded' end,
           refund_id = coalesce(p_razorpay_id, r.razorpay_refund_id, refund_id),
           refunded_at = now()
     where id = r.payment_id;
  end if;
end $$;

revoke execute on function public.begin_payment_refund(uuid, integer, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.settle_payment_refund(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.begin_payment_refund(uuid, integer, text, uuid, uuid) to service_role;
grant execute on function public.settle_payment_refund(uuid, text, text, text) to service_role;

-- Book orders: claim the refund before calling Razorpay, so two clicks (or a click and a retry) can't refund twice.
-- 'requested' = claimed, Razorpay not answered yet.
alter table public.orders drop constraint if exists orders_refund_status_check;
alter table public.orders add constraint orders_refund_status_check check (refund_status in ('requested', 'pending', 'processed', 'failed'));
