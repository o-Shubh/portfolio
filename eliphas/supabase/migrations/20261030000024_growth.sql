-- Growth: book reach for authors (views and sample opens), reader wishlists with price-drop and back-on-sale
-- notices, a notice to followers when an author publishes a new book, and an opt-in weekly email.
-- No personal data is stored for views: only a count per book per day.

-- ---------------------------------------------------------------------------
-- 1. Book reach: daily counts per book
-- ---------------------------------------------------------------------------
create table public.book_stats_daily (
  book_id      uuid not null references public.books (id) on delete cascade,
  day          date not null,
  views        integer not null default 0 check (views >= 0),
  sample_opens integer not null default 0 check (sample_opens >= 0),
  primary key (book_id, day)
);
alter table public.book_stats_daily enable row level security;
create policy "book stats: author and admin read" on public.book_stats_daily for select to authenticated
  using (public.is_admin() or exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));

-- Counts one view or sample opening (India date). Called by the server only.
create function public.count_book_event(p_book uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if p_kind not in ('view', 'sample') then raise exception 'Invalid event'; end if;
  insert into public.book_stats_daily (book_id, day, views, sample_opens)
  values (p_book, today, (p_kind = 'view')::int, (p_kind = 'sample')::int)
  on conflict (book_id, day) do update
     set views = book_stats_daily.views + excluded.views,
         sample_opens = book_stats_daily.sample_opens + excluded.sample_opens;
end $$;
revoke execute on function public.count_book_event(uuid, text) from public, anon, authenticated;
grant execute on function public.count_book_event(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Wishlist ("Save for later")
-- ---------------------------------------------------------------------------
create table public.wishlist (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  book_id        uuid not null references public.books (id) on delete cascade,
  price_at_save  numeric(10, 2),  -- to show "now ₹X less than when you saved it"
  created_at     timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index wishlist_book_idx on public.wishlist (book_id);
alter table public.wishlist enable row level security;
create policy "wishlist: own read" on public.wishlist for select to authenticated using (user_id = auth.uid());
create policy "wishlist: own add" on public.wishlist for insert to authenticated with check (user_id = auth.uid());
create policy "wishlist: own remove" on public.wishlist for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Preferences and the weekly email
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column notify_new_books boolean not null default true,    -- an author you follow publishes a book
  add column notify_saved_books boolean not null default true,  -- a saved book gets cheaper or is back on sale
  add column weekly_digest boolean not null default false,      -- opt-in email, needs an email address
  add column digest_token uuid not null default gen_random_uuid(); -- for the one-click unsubscribe link

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'refund_processed', 'contact_message', 'weekly_digest'));

-- ---------------------------------------------------------------------------
-- 4. Book notices (in-app). ref_id makes each one unique: the book for a new book or its return to sale,
--    the book and price for a price drop (so each new lower price notifies once).
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_article', 'new_post', 'new_follower', 'reply', 'verification', 'distribution', 'new_book', 'price_drop', 'back_on_sale'));

create function public.books_growth_notices() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- First time live: followers of the author (preference and blocks respected)
  if new.status = 'published' and old.status <> 'published' and old.published_at is null then
    insert into public.notifications (user_id, kind, actor_id, ref_id, title, link)
    select f.follower_id, 'new_book', new.author_id, new.id, left('New book: ' || new.title, 140), '/books/' || new.slug
      from public.follows f
      join public.profiles pr on pr.id = f.follower_id
     where f.author_id = new.author_id
       and pr.notify_new_books
       and not exists (select 1 from public.user_blocks ub
                        where (ub.blocker_id = f.follower_id and ub.blocked_id = new.author_id)
                           or (ub.blocker_id = new.author_id and ub.blocked_id = f.follower_id))
    on conflict do nothing;
  -- Live again after being taken down: readers who saved it
  elsif new.status = 'published' and old.status <> 'published' then
    insert into public.notifications (user_id, kind, actor_id, ref_id, title, link)
    select w.user_id, 'back_on_sale', new.author_id, md5(new.id::text || ':back:' || now()::date::text)::uuid,
           left('Back on sale: ' || new.title, 140), '/books/' || new.slug
      from public.wishlist w join public.profiles pr on pr.id = w.user_id
     where w.book_id = new.id and pr.notify_saved_books
    on conflict do nothing;
  end if;
  -- Cheaper while live: readers who saved it
  if new.status = 'published' and old.status = 'published' and new.mrp is not null and old.mrp is not null and new.mrp < old.mrp then
    insert into public.notifications (user_id, kind, actor_id, ref_id, title, link)
    select w.user_id, 'price_drop', new.author_id, md5(new.id::text || ':price:' || new.mrp::text)::uuid,
           left('Price drop: ' || new.title || ' is now ₹' || trim(to_char(new.mrp, 'FM999999990.##')), 140), '/books/' || new.slug
      from public.wishlist w join public.profiles pr on pr.id = w.user_id
     where w.book_id = new.id and pr.notify_saved_books
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.books_growth_notices() from public, anon, authenticated;

create trigger books_growth_notices after update of status, mrp on public.books
  for each row execute function public.books_growth_notices();
