-- Operations before launch: parcel tracking links, order update emails (with a delivery log),
-- the contact form inbox and author payout runs. Nothing here sends anything by itself.

-- ---------------------------------------------------------------------------
-- 1. Tracking link the printer pastes from the courier's receipt (optional)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column tracking_url text check (tracking_url is null or (tracking_url like 'https://%' and length(tracking_url) <= 500));
