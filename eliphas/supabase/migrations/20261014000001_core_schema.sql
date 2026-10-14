-- Eliphas Indicus Publications: core schema
-- Tables: profiles, role_invites, settings, printers, books, orders, order_items, payouts
-- Every table has Row Level Security (RLS) on. The rules are at the bottom of this file.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('reader', 'author', 'printer', 'admin');

create type public.book_status as enum (
  'draft',             -- author is still editing
  'in_review',         -- submitted, waiting for admin
  'changes_requested', -- admin sent it back with a note
  'published',         -- live in the bookstore
  'unpublished'        -- taken down by author or admin
);

create type public.order_status as enum (
  'pending_payment', -- order created, Razorpay payment not finished
  'paid',            -- payment verified, waiting for printer
  'printing',        -- printer accepted the job
  'printed',         -- printed, waiting for courier
  'shipped',         -- handed to courier
  'delivered',
  'cancelled'
);

create type public.payout_status as enum ('pending', 'paid', 'cancelled');

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: one row per logged-in person (created automatically on first login)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  phone       text unique,
  full_name   text,
  role        public.app_role not null default 'reader',
  city        text,
  state       text,
  pincode     text,
  -- Author payout details (filled later by the author)
  payout_upi  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Phone numbers that should get a role other than "reader" on first login.
-- Admin adds a printer's phone here; when the printer logs in they become a printer.
create table public.role_invites (
  phone      text primary key,            -- E.164 without '+', e.g. 919876543210
  role       public.app_role not null,
  note       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so RLS rules can call them without recursion)
-- ---------------------------------------------------------------------------
create function public.my_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Create profile when a new auth user appears
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invited public.app_role;
begin
  select role into invited from public.role_invites where phone = new.phone;
  insert into public.profiles (id, phone, role)
  values (new.id, new.phone, coalesce(invited, 'reader'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- People may edit their own profile, but only an admin may change a role,
-- except one self-service step: reader -> author ("I want to publish").
create function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null           -- auth.uid() is null for SQL editor / service role
     and not public.is_admin()
     and not (old.role = 'reader' and new.role = 'author' and new.id = auth.uid()) then
    raise exception 'Only an admin can change this role';
  end if;
  if new.phone is distinct from old.phone and auth.uid() is not null and not public.is_admin() then
    raise exception 'Phone number cannot be changed here';
  end if;
  return new;
end $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Settings: editable values (print rates, fees) so prices change without code
-- ---------------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id)
);
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Printers: print partners. user_id links to the printer's login.
-- ---------------------------------------------------------------------------
create table public.printers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  phone         text not null unique,     -- E.164 without '+'
  user_id       uuid unique references public.profiles (id) on delete set null,
  city          text not null,
  state         text not null,
  pincode       text,
  address       text,
  -- Optional per-printer rate overrides; same shape as settings.print_rates
  rate_overrides jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger printers_touch before update on public.printers
  for each row execute function public.touch_updated_at();

-- When someone logs in whose phone matches a printer, link the login to it.
create function public.link_printer_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'printer' then
    update public.printers set user_id = new.id
    where phone = new.phone and user_id is null;
  end if;
  return new;
end $$;

create trigger profiles_link_printer after insert or update of role on public.profiles
  for each row execute function public.link_printer_login();

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------
create table public.books (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles (id) on delete restrict,
  slug            text not null unique,
  title           text not null,
  subtitle        text,
  author_name     text not null,              -- name printed on the cover
  description     text,
  language        text not null default 'en' check (language in ('en', 'hi')),
  genre           text,
  isbn            text,
  -- Print options (keys must exist in settings.print_rates)
  page_count      integer check (page_count between 24 and 1000),
  trim_size       text not null default '5x8',
  binding         text not null default 'paperback',
  interior        text not null default 'bw',
  paper           text not null default 'cream',
  cover_finish    text not null default 'matte',
  -- Money, in rupees
  mrp             numeric(10, 2) check (mrp >= 0),
  print_cost      numeric(10, 2),             -- snapshot when submitted
  -- Files in Supabase Storage
  manuscript_path text,                       -- bucket: manuscripts (private)
  cover_path      text,                       -- bucket: covers (public)
  -- Review workflow
  status          public.book_status not null default 'draft',
  review_note     text,
  reviewed_by     uuid references public.profiles (id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index books_author_idx on public.books (author_id);
create index books_status_idx on public.books (status);
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();

-- Authors can only move a book between draft, in_review and unpublished.
-- Publishing and sending back is an admin action.
create function public.guard_book_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New books must start as draft';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if not (
      (old.status in ('draft', 'changes_requested') and new.status = 'in_review') or
      (old.status = 'in_review' and new.status = 'draft') or
      (old.status = 'published' and new.status = 'unpublished') or
      (old.status = 'unpublished' and new.status = 'in_review')
    ) then
      raise exception 'Authors cannot move a book from % to %', old.status, new.status;
    end if;
  end if;
  -- A live book's content cannot be edited without going back through review
  if old.status in ('published', 'in_review') and new.status = old.status then
    raise exception 'This book is % and cannot be edited now', old.status;
  end if;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.published_at := old.published_at;
  new.author_id := old.author_id;
  return new;
end $$;

create trigger books_guard_status before insert or update on public.books
  for each row execute function public.guard_book_status();

-- ---------------------------------------------------------------------------
-- Orders (created by the server during checkout, never directly by the browser)
-- ---------------------------------------------------------------------------
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique
                        default ('EIP-' || to_char(now(), 'YYMMDD') || '-' ||
                                 upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  buyer_id            uuid not null references public.profiles (id),
  status              public.order_status not null default 'pending_payment',
  -- Money, in rupees
  subtotal            numeric(10, 2) not null,
  shipping            numeric(10, 2) not null default 0,
  total               numeric(10, 2) not null,
  -- Razorpay
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  -- Delivery address
  ship_name           text not null,
  ship_phone          text not null,
  ship_line1          text not null,
  ship_line2          text,
  ship_city           text not null,
  ship_state          text not null,
  ship_pincode        text not null,
  -- Fulfilment
  printer_id          uuid references public.printers (id),
  courier             text,
  tracking_number     text,
  paid_at             timestamptz,
  printed_at          timestamptz,
  shipped_at          timestamptz,
  delivered_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index orders_buyer_idx on public.orders (buyer_id);
create index orders_printer_idx on public.orders (printer_id);
create index orders_status_idx on public.orders (status);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- One line per book in an order. Money split is frozen at purchase time.
create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  book_id        uuid not null references public.books (id),
  author_id      uuid not null references public.profiles (id),
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(10, 2) not null,  -- MRP
  print_cost     numeric(10, 2) not null,  -- per copy
  platform_fee   numeric(10, 2) not null,  -- per copy (Rs 15 by default)
  payment_fee    numeric(10, 2) not null,  -- per copy (gateway charges)
  author_earning numeric(10, 2) not null,  -- per copy
  created_at     timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_author_idx on public.order_items (author_id);
create index order_items_book_idx on public.order_items (book_id);

-- ---------------------------------------------------------------------------
-- Payouts to authors
-- ---------------------------------------------------------------------------
create table public.payouts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id),
  amount       numeric(10, 2) not null check (amount > 0),
  status       public.payout_status not null default 'pending',
  reference    text,                -- UPI / bank UTR number
  note         text,
  period_start date,
  period_end   date,
  paid_at      timestamptz,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index payouts_author_idx on public.payouts (author_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.role_invites enable row level security;
alter table public.settings     enable row level security;
alter table public.printers     enable row level security;
alter table public.books        enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.payouts      enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- role_invites: admin only
create policy "role_invites: admin" on public.role_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: anyone can read (pricing page needs rates), admin edits
create policy "settings: public read" on public.settings
  for select using (true);
create policy "settings: admin write" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- printers
create policy "printers: admin" on public.printers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "printers: read own" on public.printers
  for select using (user_id = auth.uid());

-- books
create policy "books: public reads published" on public.books
  for select using (status = 'published');
create policy "books: author reads own" on public.books
  for select using (author_id = auth.uid() or public.is_admin());
create policy "books: author creates" on public.books
  for insert with check (
    author_id = auth.uid() and public.my_role() in ('author', 'admin')
  );
create policy "books: author edits own" on public.books
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "books: author deletes own draft" on public.books
  for delete using (
    (author_id = auth.uid() and status = 'draft') or public.is_admin()
  );

-- orders: buyers read their own; printers read/update assigned; admin all.
-- Inserts happen on the server with the service key, so no insert policy.
create policy "orders: buyer reads own" on public.orders
  for select using (buyer_id = auth.uid());
create policy "orders: printer reads assigned" on public.orders
  for select using (
    printer_id in (select id from public.printers where user_id = auth.uid())
  );
create policy "orders: admin" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- order_items
create policy "order_items: visible with order" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id)  -- inherits orders RLS
  );
create policy "order_items: author reads own sales" on public.order_items
  for select using (author_id = auth.uid());
create policy "order_items: admin" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- payouts
create policy "payouts: author reads own" on public.payouts
  for select using (author_id = auth.uid());
create policy "payouts: admin" on public.payouts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets
--   manuscripts: private PDFs. Path: <author_id>/<book_id>/manuscript.pdf
--   covers:      public images. Path: <author_id>/<book_id>/cover.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('manuscripts', 'manuscripts', false, 52428800, array['application/pdf']),
  ('covers', 'covers', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "manuscripts: author uploads own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'manuscripts' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "manuscripts: author updates own folder" on storage.objects
  for update to authenticated using (
    bucket_id = 'manuscripts' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "manuscripts: author or admin reads" on storage.objects
  for select to authenticated using (
    bucket_id = 'manuscripts' and
    ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "manuscripts: author deletes own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'manuscripts' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "covers: author uploads own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "covers: author updates own folder" on storage.objects
  for update to authenticated using (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "covers: author deletes own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
-- covers bucket is public, so reading needs no policy.
