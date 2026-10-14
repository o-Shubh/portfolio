-- Milestone 4: admin

-- Orders that count towards an author's earnings (payment received, not cancelled)
create function public.is_earning_status(s public.order_status)
returns boolean language sql immutable as $$
  select s in ('paid', 'printing', 'printed', 'shipped', 'delivered')
$$;

-- What each author has earned, been paid, and is still owed.
-- security_invoker: the reader's own RLS rules apply, so an author sees only
-- their own row and an admin sees everyone.
create view public.author_balances
with (security_invoker = true) as
select
  p.id as author_id,
  p.full_name,
  p.phone,
  p.payout_upi,
  coalesce(e.earned, 0)::numeric(12, 2)  as earned,
  coalesce(e.copies, 0)::integer          as copies_sold,
  coalesce(pp.paid, 0)::numeric(12, 2)    as paid,
  (coalesce(e.earned, 0) - coalesce(pp.paid, 0))::numeric(12, 2) as balance
from public.profiles p
left join (
  select oi.author_id, sum(oi.author_earning * oi.quantity) as earned, sum(oi.quantity) as copies
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where public.is_earning_status(o.status)
  group by oi.author_id
) e on e.author_id = p.id
left join (
  select author_id, sum(amount) as paid
  from public.payouts
  where status = 'paid'
  group by author_id
) pp on pp.author_id = p.id
where p.role = 'author' or e.earned is not null;

-- "Who did this" columns should not block deleting a user account; just forget the name.
alter table public.settings drop constraint settings_updated_by_fkey,
  add constraint settings_updated_by_fkey foreign key (updated_by) references public.profiles (id) on delete set null;
alter table public.books drop constraint books_reviewed_by_fkey,
  add constraint books_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null;
alter table public.payouts drop constraint payouts_created_by_fkey,
  add constraint payouts_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;
