-- Distribution requests: an author asks Eliphas to review one of their published books for
-- Amazon India, Flipkart or international distribution. Intake and review only: nothing is
-- submitted to a retailer, nothing is charged, and existing royalties are unchanged.

create table public.distribution_requests (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references public.profiles (id) on delete cascade,
  book_id           uuid not null references public.books (id) on delete cascade,
  channel           text not null check (channel in ('amazon_india', 'flipkart', 'international')),
  markets           text not null check (length(btrim(markets)) between 2 and 200),
  residence_country text not null check (length(btrim(residence_country)) between 2 and 80),
  rights_confirmed  boolean not null check (rights_confirmed),
  status            text not null default 'requested'
                    check (status in ('requested', 'reviewing', 'needs_information', 'declined')),
  review_note       text not null default '' check (length(review_note) <= 2000),
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (book_id, channel)
);
create index distribution_requests_queue on public.distribution_requests (created_at desc);
create index distribution_requests_author on public.distribution_requests (author_id, created_at desc);

-- The database stamps every review: who, when, and a fresh updated_at (used to reject stale edits)
create function public.stamp_distribution_review()
returns trigger language plpgsql as $$
begin
  -- clock_timestamp(), not now(): two saves in one transaction still get different values
  new.updated_at = clock_timestamp();
  new.reviewed_at = new.updated_at;
  new.reviewed_by = auth.uid();
  return new;
end $$;
create trigger distribution_requests_review before update on public.distribution_requests
  for each row execute function public.stamp_distribution_review();

-- The author's own live book. Security definer because removed_at isn't readable by authors (column grants).
create function public.can_request_distribution(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.books b
    where b.id = target and b.author_id = auth.uid() and b.status = 'published' and b.removed_at is null
  )
$$;

alter table public.distribution_requests enable row level security;
revoke all on public.distribution_requests from anon, authenticated;
grant select on public.distribution_requests to authenticated;
-- Authors can only fill in the request itself; status, notes and timestamps take their defaults
grant insert (author_id, book_id, channel, markets, residence_country, rights_confirmed)
  on public.distribution_requests to authenticated;
grant update (status, review_note) on public.distribution_requests to authenticated;

create policy "distribution: author or admin reads" on public.distribution_requests
  for select to authenticated using (author_id = auth.uid() or public.is_admin());
create policy "distribution: author requests own published book" on public.distribution_requests
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'requested' and review_note = ''
    and public.my_role() in ('author', 'admin')
    and public.can_request_distribution(book_id)
  );
create policy "distribution: admin reviews" on public.distribution_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
