-- Community updates, saved file versions, and verified-purchase reviews.
-- Additive only: no existing rows are changed except to record the current files as version 1.

-- ---------------------------------------------------------------------------
-- 1. Saved file versions
-- Every manuscript / print cover / cover image an author uploads is kept as its own file and listed here.
-- When our team approves a book, the versions it approved are pinned on the book; orders print those.
-- ---------------------------------------------------------------------------
create table public.book_file_versions (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.books (id) on delete cascade,
  kind         text not null check (kind in ('manuscript', 'print_cover', 'cover')),
  version      integer not null check (version >= 1),
  path         text not null check (char_length(path) <= 300),
  page_count   integer,
  width_in     numeric(6, 2),
  height_in    numeric(6, 2),
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (book_id, kind, version)
);
create index book_file_versions_book_idx on public.book_file_versions (book_id, kind, version desc);
alter table public.book_file_versions enable row level security;
create policy "file versions: author reads own" on public.book_file_versions for select
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));
create policy "file versions: admin" on public.book_file_versions for all using (public.is_admin()) with check (public.is_admin());

alter table public.books
  add column approved_files       jsonb,         -- {manuscript: {id, version, path}, print_cover: {...}, cover: {...}} pinned at approval
  add column approved_files_at    timestamptz,
  add column files_confirmed_at   timestamptz;   -- author confirmed the files they're submitting

-- Existing books: today's files become version 1, and live books count them as approved
insert into public.book_file_versions (book_id, kind, version, path, page_count, width_in, height_in, uploaded_by, created_at)
select b.id, 'manuscript', 1, b.manuscript_path, b.page_count, b.manuscript_width_in, b.manuscript_height_in, b.author_id, b.updated_at
  from public.books b where b.manuscript_path is not null;
insert into public.book_file_versions (book_id, kind, version, path, uploaded_by, created_at)
select b.id, 'print_cover', 1, b.print_cover_path, b.author_id, b.updated_at from public.books b where b.print_cover_path is not null;
insert into public.book_file_versions (book_id, kind, version, path, uploaded_by, created_at)
select b.id, 'cover', 1, b.cover_path, b.author_id, b.updated_at from public.books b where b.cover_path is not null;

update public.books b
   set approved_files = (
         select jsonb_object_agg(v.kind, jsonb_build_object('id', v.id, 'version', v.version, 'path', v.path))
           from public.book_file_versions v where v.book_id = b.id
       ),
       approved_files_at = coalesce(b.published_at, now())
 where b.status = 'published'
   and exists (select 1 from public.book_file_versions v where v.book_id = b.id);

-- ---------------------------------------------------------------------------
-- 2. Community: short updates from authors
-- ---------------------------------------------------------------------------
create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null default '' check (char_length(body) <= 1000),
  image_path       text check (char_length(image_path) <= 300),
  image_alt        text check (char_length(image_alt) <= 200),
  related_book_id  uuid references public.books (id) on delete set null,
  status           text not null default 'draft' check (status in ('draft', 'published')),
  moderation       text not null default 'visible' check (moderation in ('visible', 'hidden', 'removed')),
  moderation_reason text,
  published_at     timestamptz,
  first_published_at timestamptz,
  edited_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (status = 'draft' or (published_at is not null and char_length(trim(body)) >= 1))
);
create index posts_public_idx on public.posts (published_at desc) where status = 'published' and moderation = 'visible';
create index posts_author_idx on public.posts (author_id, created_at desc);
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();
alter table public.posts enable row level security;
create policy "posts: public reads published" on public.posts for select using (status = 'published' and moderation = 'visible');
create policy "posts: author reads own" on public.posts for select using (author_id = auth.uid());
create policy "posts: admin" on public.posts for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.post_is_public(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.posts where id = p and status = 'published' and moderation = 'visible')
$$;

create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)          -- one like per account
);
alter table public.post_likes enable row level security;
create policy "post likes: own" on public.post_likes for select using (user_id = auth.uid());

create table public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  moderation  text not null default 'visible' check (moderation in ('visible', 'hidden', 'removed')),
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);
create index post_comments_user_idx on public.post_comments (user_id, created_at desc);
alter table public.post_comments enable row level security;
create policy "post comments: public reads visible" on public.post_comments for select
  using (moderation = 'visible' and public.post_is_public(post_id));
create policy "post comments: admin" on public.post_comments for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- Reports, moderation and notifications learn about posts
alter table public.content_reports drop constraint content_reports_target_type_check;
alter table public.content_reports add constraint content_reports_target_type_check
  check (target_type in ('article', 'comment', 'post', 'post_comment', 'review'));
alter table public.moderation_actions drop constraint moderation_actions_target_type_check;
alter table public.moderation_actions add constraint moderation_actions_target_type_check
  check (target_type in ('article', 'comment', 'user', 'post', 'post_comment', 'review'));

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('new_article', 'new_post'));
alter table public.notifications add column post_id uuid references public.posts (id) on delete cascade;
create unique index notifications_post_once_idx on public.notifications (user_id, kind, post_id) where post_id is not null;

alter table public.profiles add column notify_new_posts boolean not null default true;

-- First publication of an update notifies followers once (preference and blocks respected); later edits never do
create or replace function public.publish_post(p_post uuid, p_author uuid)
returns table (first_time boolean, notified integer)
language plpgsql security definer set search_path = public as $$
declare
  p public.posts;
  n integer := 0;
begin
  select * into p from public.posts where id = p_post for update;
  if not found or p.author_id <> p_author then raise exception 'POST_NOT_FOUND'; end if;
  if p.moderation <> 'visible' then raise exception 'POST_MODERATED'; end if;
  update public.posts
     set status = 'published',
         published_at = coalesce(published_at, now()),
         first_published_at = coalesce(first_published_at, now())
   where id = p_post;
  if p.first_published_at is null then
    insert into public.notifications (user_id, kind, actor_id, post_id, title, link)
    select f.follower_id, 'new_post', p_author, p_post, left(regexp_replace(p.body, '\s+', ' ', 'g'), 120), '/community/' || p_post
      from public.follows f
      join public.profiles pr on pr.id = f.follower_id
     where f.author_id = p_author
       and pr.notify_new_posts
       and not exists (select 1 from public.user_blocks ub
                        where (ub.blocker_id = f.follower_id and ub.blocked_id = p_author)
                           or (ub.blocker_id = p_author and ub.blocked_id = f.follower_id))
    on conflict do nothing;
    get diagnostics n = row_count;
  end if;
  return query select p.first_published_at is null, n;
end $$;
revoke execute on function public.publish_post(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Verified-purchase reviews
-- Only a reader whose order with this book was delivered may review it, once per book.
-- ---------------------------------------------------------------------------
create table public.book_reviews (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text check (char_length(body) <= 1500),
  moderation  text not null default 'visible' check (moderation in ('visible', 'hidden', 'removed')),
  edited_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (book_id, user_id)
);
create index book_reviews_book_idx on public.book_reviews (book_id, created_at desc);
alter table public.book_reviews enable row level security;
create policy "reviews: public reads visible" on public.book_reviews for select
  using (moderation = 'visible' and exists (select 1 from public.books b where b.id = book_id and b.status = 'published'));
create policy "reviews: admin" on public.book_reviews for all using (public.is_admin()) with check (public.is_admin());
