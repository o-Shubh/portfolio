-- Author Articles: longer essays, reflections, writing advice and authorised excerpts.
-- Also the community basics Articles needs and the app didn't have yet: public author profiles
-- (handle + bio), follows, in-app notifications with a preference, blocking, reports, moderation
-- and account restrictions.
--
-- Articles are written and stored by the server (service role). Row Level Security only lets the
-- public read published, visible articles and their visible comments; drafts, bookmarks, likes,
-- views and notifications are never readable through the public API.

-- ---------------------------------------------------------------------------
-- Public author profile fields and the notification preference
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column handle text unique check (handle ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  add column bio text check (char_length(bio) <= 600),
  add column notify_new_articles boolean not null default true;

-- Existing authors get a stable handle for their public page (name + short id; Hindi-only names fall back to "author")
update public.profiles
   set handle = left(coalesce(nullif(trim(both '-' from lower(regexp_replace(coalesce(full_name, ''), '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'author'), 30)
                || '-' || substr(replace(id::text, '-', ''), 1, 6)
 where role in ('author', 'admin') and handle is null;

-- New authors get one automatically once they have a name (onboarding, or "I want to publish")
create or replace function public.profile_default_handle()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.handle is null and new.role in ('author', 'admin') and coalesce(trim(new.full_name), '') <> '' then
    new.handle := left(coalesce(nullif(trim(both '-' from lower(regexp_replace(new.full_name, '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'author'), 30)
                  || '-' || substr(md5(new.id::text || clock_timestamp()::text), 1, 6);
  end if;
  return new;
end $$;
create trigger profiles_default_handle before insert or update of role, full_name on public.profiles
  for each row execute function public.profile_default_handle();

-- What the public may see of an author: name, handle and bio only (never phone or address)
create view public.public_authors with (security_invoker = false) as
  select id, handle, full_name, bio from public.profiles where role in ('author', 'admin') and handle is not null;
grant select on public.public_authors to anon, authenticated;

-- Admin-only: accounts restricted from posting (articles, comments, reports) after abuse
create table public.account_restrictions (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  reason      text not null check (char_length(reason) between 3 and 500),
  until       timestamptz,                    -- null = until lifted
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.account_restrictions enable row level security;
create policy "restrictions: admin" on public.account_restrictions for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------
create table public.articles (
  id                  uuid primary key default gen_random_uuid(),
  short_id            text not null unique default lower(substr(md5(gen_random_uuid()::text), 1, 8)),  -- stable in the URL
  slug                text not null default '' check (char_length(slug) <= 90),   -- readable part; may change, links still work
  author_id           uuid not null references public.profiles (id) on delete cascade,
  title               text not null default '' check (char_length(title) <= 150),
  excerpt             text not null default '' check (char_length(excerpt) <= 300),
  cover_path          text,
  cover_alt           text check (char_length(cover_alt) <= 200),
  language            text not null default 'en' check (language in ('en', 'hi')),
  topic               text check (topic in ('essay', 'reflection', 'writing-advice', 'book-excerpt', 'behind-the-book', 'other')),
  tags                text[] not null default '{}' check (cardinality(tags) <= 5),
  body_md             text not null default '' check (char_length(body_md) <= 40000),   -- source the author edits
  body                jsonb not null default '[]',                                        -- parsed, safe blocks the page renders
  word_count          integer not null default 0,
  related_book_id     uuid references public.books (id) on delete set null,
  status              text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  moderation          text not null default 'visible' check (moderation in ('visible', 'hidden', 'removed')),
  moderation_reason   text,
  rights_confirmed_at timestamptz,
  first_published_at  timestamptz,           -- set once; followers are notified only then
  published_at        timestamptz,
  content_updated_at  timestamptz,           -- last edit after publishing (shown as "Updated")
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (status = 'draft' or (rights_confirmed_at is not null and published_at is not null))
);
create index articles_public_idx on public.articles (published_at desc) where status = 'published' and moderation = 'visible';
create index articles_author_idx on public.articles (author_id, updated_at desc);
create index articles_topic_idx on public.articles (topic, published_at desc) where status = 'published' and moderation = 'visible';
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();
alter table public.articles enable row level security;
create policy "articles: public reads published" on public.articles for select
  using (status = 'published' and moderation = 'visible');
create policy "articles: author reads own" on public.articles for select using (author_id = auth.uid());
create policy "articles: admin" on public.articles for all using (public.is_admin()) with check (public.is_admin());

create function public.article_is_public(p_article uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.articles where id = p_article and status = 'published' and moderation = 'visible')
$$;

-- One like and one bookmark per account per article (database-enforced)
create table public.article_likes (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);
alter table public.article_likes enable row level security;
create policy "likes: own" on public.article_likes for select using (user_id = auth.uid());

create table public.article_bookmarks (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);
create index article_bookmarks_user_idx on public.article_bookmarks (user_id, created_at desc);
alter table public.article_bookmarks enable row level security;
create policy "bookmarks: own" on public.article_bookmarks for select using (user_id = auth.uid());

-- Flat comments
create table public.article_comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  moderation  text not null default 'visible' check (moderation in ('visible', 'hidden', 'removed')),
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index article_comments_article_idx on public.article_comments (article_id, created_at);
create index article_comments_user_idx on public.article_comments (user_id, created_at desc);
alter table public.article_comments enable row level security;
create policy "comments: public reads visible" on public.article_comments for select
  using (moderation = 'visible' and public.article_is_public(article_id));
create policy "comments: admin" on public.article_comments for all using (public.is_admin()) with check (public.is_admin());

-- Views: once per signed-in reader or browser per article per day. Not unique people.
create table public.article_views (
  article_id uuid not null references public.articles (id) on delete cascade,
  viewer_key text not null,
  day        date not null default (now() at time zone 'Asia/Kolkata')::date,
  primary key (article_id, viewer_key, day)
);
create index article_views_day_idx on public.article_views (article_id, day);
alter table public.article_views enable row level security;

-- Clicks on the related-book card ("View book"), deduplicated the same way
create table public.article_book_clicks (
  article_id uuid not null references public.articles (id) on delete cascade,
  viewer_key text not null,
  day        date not null default (now() at time zone 'Asia/Kolkata')::date,
  book_id    uuid references public.books (id) on delete set null,
  primary key (article_id, viewer_key, day)
);
alter table public.article_book_clicks enable row level security;

-- ---------------------------------------------------------------------------
-- Follows, blocks, notifications
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, author_id),
  check (follower_id <> author_id)
);
create index follows_author_idx on public.follows (author_id);
alter table public.follows enable row level security;
create policy "follows: own" on public.follows for select using (follower_id = auth.uid());

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
create policy "blocks: own" on public.user_blocks for select using (blocker_id = auth.uid());

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('new_article')),
  actor_id    uuid references public.profiles (id) on delete set null,
  article_id  uuid references public.articles (id) on delete cascade,
  title       text not null,
  link        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, kind, article_id)          -- never the same notification twice
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "notifications: own" on public.notifications for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reports and moderation log
-- ---------------------------------------------------------------------------
create table public.content_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  target_type  text not null check (target_type in ('article', 'comment')),
  target_id    uuid not null,
  reason       text not null check (reason in ('spam', 'abuse', 'hate', 'copyright', 'private-info', 'other')),
  details      text check (char_length(details) <= 1000),
  status       text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create unique index content_reports_once_idx on public.content_reports (reporter_id, target_type, target_id) where status = 'open';
create index content_reports_open_idx on public.content_reports (status, created_at);
alter table public.content_reports enable row level security;
create policy "reports: admin" on public.content_reports for all using (public.is_admin()) with check (public.is_admin());

create table public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  target_type  text not null check (target_type in ('article', 'comment', 'user')),
  target_id    uuid not null,
  action       text not null check (action in ('hide', 'restore', 'remove', 'restrict', 'unrestrict', 'dismiss')),
  reason       text not null check (char_length(reason) between 3 and 500),
  created_at   timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id, created_at desc);
alter table public.moderation_actions enable row level security;
create policy "moderation: admin" on public.moderation_actions for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Publishing: set the dates and, on the first publication only, notify followers once
-- ---------------------------------------------------------------------------
create function public.publish_article(p_article uuid, p_author uuid)
returns table (first_time boolean, notified integer)
language plpgsql security definer set search_path = public as $$
declare
  a public.articles;
  n integer := 0;
  first boolean;
begin
  select * into a from public.articles where id = p_article and author_id = p_author for update;
  if a.id is null then raise exception 'ARTICLE_NOT_FOUND'; end if;
  if a.moderation <> 'visible' then raise exception 'ARTICLE_MODERATED'; end if;
  if a.rights_confirmed_at is null then raise exception 'RIGHTS_NOT_CONFIRMED'; end if;
  first := a.first_published_at is null;
  update public.articles
     set status = 'published',
         published_at = coalesce(a.first_published_at, now()),
         first_published_at = coalesce(a.first_published_at, now())
   where id = a.id;
  if first then
    insert into public.notifications (user_id, kind, actor_id, article_id, title, link)
    select f.follower_id, 'new_article', a.author_id, a.id,
           coalesce((select full_name from public.profiles where id = a.author_id), 'An author') || ' published: ' || a.title,
           '/articles/' || a.short_id || case when a.slug <> '' then '-' || a.slug else '' end
      from public.follows f
      join public.profiles p on p.id = f.follower_id
     where f.author_id = a.author_id
       and p.notify_new_articles
       and not exists (select 1 from public.user_blocks b
                        where (b.blocker_id = f.follower_id and b.blocked_id = a.author_id)
                           or (b.blocker_id = a.author_id and b.blocked_id = f.follower_id))
    on conflict (user_id, kind, article_id) do nothing;
    get diagnostics n = row_count;
  end if;
  return query select first, n;
end $$;
revoke execute on function public.publish_article(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Article covers: public images, written only by the server after checks and re-encoding
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-covers', 'article-covers', true, 2097152, array['image/webp'])
on conflict (id) do nothing;

-- Author page addresses (/authors/{handle}) stay stable: people can't change their handle themselves
create or replace function public.guard_profile_handle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.handle is distinct from old.handle and auth.uid() is not null and not public.is_admin() then
    raise exception 'Profile handle cannot be changed here';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_handle on public.profiles;
create trigger profiles_guard_handle before update of handle on public.profiles
  for each row execute function public.guard_profile_handle();
