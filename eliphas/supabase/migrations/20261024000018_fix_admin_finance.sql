-- Fix: admin_finance failed with "cannot cast type record to order_items" whenever there were paid orders,
-- because the lines CTE carried an extra order_status column that made each row not castable to order_items.
-- The column was never used; removing it restores the Finance page. Figures and permissions are unchanged.
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
