-- Assisted requests only: no retailer submission or payments.
create table public.distribution_requests (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id),
 book_id uuid not null references public.books(id),
 channel text not null check (channel in ('amazon_india','flipkart','international')),
 markets text not null check (length(trim(markets)) between 2 and 200),
 residence_country text not null check (length(trim(residence_country)) between 2 and 80),
 rights_confirmed boolean not null check (rights_confirmed),
 status text not null default 'requested' check (status in ('requested','reviewing','needs_information','declined')),
 review_note text not null default '' check (length(review_note) <= 2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(book_id,channel)
);
alter table public.distribution_requests enable row level security;
revoke all on public.distribution_requests from anon, authenticated;
grant select, insert on public.distribution_requests to authenticated;
grant update(status,review_note,updated_at) on public.distribution_requests to authenticated;
create policy distribution_read on public.distribution_requests for select to authenticated
 using (author_id = auth.uid() or public.is_admin());
create policy distribution_request on public.distribution_requests for insert to authenticated
 with check (author_id = auth.uid() and status = 'requested' and review_note = ''
 and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('author','admin'))
 and exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid() and b.status = 'published' and b.removed_at is null));
create policy distribution_review on public.distribution_requests for update to authenticated
 using (public.is_admin()) with check (public.is_admin());
create index distribution_queue on public.distribution_requests(created_at desc);
