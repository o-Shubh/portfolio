-- Milestone 5: checkout and printing

alter table public.orders
  add column payment_mode text check (payment_mode in ('razorpay', 'mock')),
  add column accepted_at  timestamptz;  -- printer started printing

-- Fast lookups for the printer queue and the payment webhook
create index orders_printer_status_idx on public.orders (printer_id, status);

-- Open jobs per printer, used to share new orders fairly between printers
create view public.printer_load
with (security_invoker = true) as
select p.id as printer_id, p.state, p.active,
  count(o.id) filter (where o.status in ('paid', 'printing', 'printed')) as open_jobs
from public.printers p
left join public.orders o on o.printer_id = p.id
group by p.id;
