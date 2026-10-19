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
