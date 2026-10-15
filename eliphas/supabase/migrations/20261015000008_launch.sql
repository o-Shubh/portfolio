-- Launch: business details for legal pages, order cancellation and refunds,
-- and account deletion for readers.

-- ---------------------------------------------------------------------------
-- Business details shown on Contact, Terms, Privacy, Refund and Shipping pages.
-- Edited by an admin in Settings. Empty values show as "to be added".
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values (
  'business',
  '{
    "legal_name": "",
    "address": "",
    "email": "",
    "phone": "",
    "gstin": "",
    "grievance_officer": "",
    "jurisdiction_city": "",
    "support_hours": "Monday to Saturday, 10:00 to 18:00 IST"
  }'::jsonb
) on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Cancellation and refunds
-- ---------------------------------------------------------------------------
alter table public.orders
  add column cancelled_at  timestamptz,
  add column cancel_reason text,
  add column cancelled_by  text check (cancelled_by in ('buyer', 'admin')),
  add column refund_status text check (refund_status in ('pending', 'processed', 'failed')),
  add column refund_id     text,
  add column refund_amount numeric(10, 2),
  add column refunded_at   timestamptz;

-- ---------------------------------------------------------------------------
-- Account deletion: a reader's orders stay (needed for tax records) but are no
-- longer linked to the deleted account.
-- ---------------------------------------------------------------------------
alter table public.orders alter column buyer_id drop not null;
alter table public.orders drop constraint orders_buyer_id_fkey;
alter table public.orders
  add constraint orders_buyer_id_fkey foreign key (buyer_id) references public.profiles (id) on delete set null;
