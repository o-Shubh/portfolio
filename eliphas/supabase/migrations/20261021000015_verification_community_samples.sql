-- Author verification, community for everyone (readers too), two-level replies, post bookmarks,
-- more in-app notifications, reader profiles, sample approval and author responses to reviews.
-- Additive: existing accounts, books, posts and permissions are kept. Existing authors are NOT marked
-- verified automatically; admins review them from Admin → Authors.

-- ---------------------------------------------------------------------------
-- 1. Author verification
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column verified_author_at timestamptz,             -- set only by an admin decision
  add column verified_author_by uuid references public.profiles (id) on delete set null,
  add column notify_followers boolean not null default true,
  add column notify_replies boolean not null default true;

create table public.author_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  pen_name      text not null check (char_length(pen_name) between 2 and 80),
  bio           text not null check (char_length(bio) between 20 and 600),
  language      text not null check (language in ('en', 'hi', 'both')),
  evidence      text not null check (char_length(evidence) between 10 and 2000),   -- book links, ISBNs, manuscript ownership notes
  status        text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected', 'revoked')),
  decision_note text check (char_length(decision_note) <= 1000),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index author_applications_status_idx on public.author_applications (status, created_at);
create unique index author_applications_open_idx on public.author_applications (user_id) where status in ('pending', 'changes_requested');
create trigger author_applications_touch before update on public.author_applications for each row execute function public.touch_updated_at();
alter table public.author_applications enable row level security;
create policy "applications: own" on public.author_applications for select using (user_id = auth.uid());
create policy "applications: admin" on public.author_applications for all using (public.is_admin()) with check (public.is_admin());

-- Every status change is kept (who, when, what)
create table public.author_verification_events (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  application_id uuid references public.author_applications (id) on delete set null,
  status      text not null,
  note        text,
  actor_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index author_verification_events_user_idx on public.author_verification_events (user_id, created_at desc);
alter table public.author_verification_events enable row level security;
create policy "verification events: own" on public.author_verification_events for select using (user_id = auth.uid());
create policy "verification events: admin" on public.author_verification_events for all using (public.is_admin()) with check (public.is_admin());

-- Only admins (or the server) can set or clear verification
create or replace function public.guard_profile_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.verified_author_at is distinct from old.verified_author_at or new.verified_author_by is distinct from old.verified_author_by)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change author verification';
  end if;
  return new;
end $$;
create trigger profiles_guard_verification before update of verified_author_at, verified_author_by on public.profiles
  for each row execute function public.guard_profile_verification();

-- ---------------------------------------------------------------------------
-- 2. Public profiles for everyone who takes part (readers too)
-- ---------------------------------------------------------------------------
create or replace function public.profile_default_handle()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.handle is null and coalesce(trim(new.full_name), '') <> '' then
    new.handle := left(coalesce(nullif(trim(both '-' from lower(regexp_replace(new.full_name, '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'member'), 30)
                  || '-' || substr(md5(new.id::text || clock_timestamp()::text), 1, 6);
  end if;
  return new;
end $$;

update public.profiles
   set handle = left(coalesce(nullif(trim(both '-' from lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'member'), 30)
                || '-' || substr(md5(id::text || clock_timestamp()::text), 1, 6)
 where handle is null and coalesce(trim(full_name), '') <> '';

-- Name, handle, bio, photo and verification only: never phone, address or orders
create view public.public_profiles with (security_invoker = false) as
  select id, handle, full_name, bio, avatar_path, role in ('author', 'admin') as is_author, verified_author_at is not null as verified_author
    from public.profiles where handle is not null;
grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Community for everyone: longer posts, replies to comments, private bookmarks
-- ---------------------------------------------------------------------------
alter table public.posts drop constraint posts_body_check;
alter table public.posts add constraint posts_body_check check (char_length(body) <= 3000);

alter table public.post_comments add column parent_id uuid references public.post_comments (id) on delete cascade;
alter table public.post_comments drop constraint post_comments_body_check;
alter table public.post_comments add constraint post_comments_body_check check (char_length(body) between 1 and 2000);
create index post_comments_parent_idx on public.post_comments (parent_id, created_at);

-- Two levels only: a reply must answer a top-level comment on the same post
create or replace function public.check_comment_depth()
returns trigger language plpgsql set search_path = public as $$
declare p public.post_comments;
begin
  if new.parent_id is null then return new; end if;
  select * into p from public.post_comments where id = new.parent_id;
  if not found or p.post_id <> new.post_id or p.parent_id is not null then
    raise exception 'Replies can only answer a top-level comment on the same post';
  end if;
  return new;
end $$;
create trigger post_comments_depth before insert or update of parent_id on public.post_comments
  for each row execute function public.check_comment_depth();

create table public.post_bookmarks (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_bookmarks enable row level security;
create policy "post bookmarks: own" on public.post_bookmarks for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Notifications: new follower, replies, verification decisions
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_article', 'new_post', 'new_follower', 'reply', 'verification'));
alter table public.notifications add column ref_id uuid;   -- the follower, comment or application the notification is about
-- Not partial, so upserts can target it; rows without ref_id never clash (nulls are distinct)
create unique index notifications_ref_once_idx on public.notifications (user_id, kind, ref_id);

-- ---------------------------------------------------------------------------
-- 5. Samples: drafted privately, approved by the author, then published
-- ---------------------------------------------------------------------------
alter table public.books
  add column sample_draft_path      text check (char_length(sample_draft_path) <= 300),   -- private (manuscripts bucket) until approved
  add column sample_draft_from      integer,
  add column sample_draft_to        integer,
  add column sample_draft_source    text check (sample_draft_source in ('pages', 'upload')),
  add column sample_source          text check (sample_source in ('pages', 'upload')),
  add column sample_manuscript_version integer,       -- manuscript version the approved sample was made from
  add column sample_approved_at     timestamptz;

-- Uploaded samples have no page range
alter table public.books drop constraint books_sample_range;
alter table public.books add constraint books_sample_range check (
  sample_path is null
  or sample_from is null
  or (sample_to >= sample_from and sample_to - sample_from < 30)
);
update public.books set sample_source = 'pages', sample_approved_at = coalesce(sample_approved_at, updated_at) where sample_path is not null and sample_source is null;

-- ---------------------------------------------------------------------------
-- 6. Reviews: any logged-in reader may review; authors may respond (never delete)
-- ---------------------------------------------------------------------------
alter table public.book_reviews
  add column author_response    text check (char_length(author_response) <= 1000),
  add column author_response_at timestamptz;

-- Whether a review is from a verified purchase is worked out from current order status every time it is shown,
-- so cancellations and refunds are reflected immediately.
create or replace function public.review_is_verified(p_book uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
     where oi.book_id = p_book and o.buyer_id = p_user and o.status = 'delivered' and oi.reversed_at is null
  )
$$;
revoke execute on function public.review_is_verified(uuid, uuid) from public, anon;
grant execute on function public.review_is_verified(uuid, uuid) to authenticated;
