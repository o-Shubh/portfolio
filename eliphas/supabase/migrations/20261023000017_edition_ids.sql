-- Eliphas Edition IDs (EEID), e.g. EEID-2026-000123: our own permanent identifier for each approved book
-- edition/format, with a public page at /e/{EEID}. Not an ISBN (kept separate in books.isbn), not a copyright
-- registration and not proof that a physical copy is genuine. Each books row is one edition/format (its own
-- binding and language), so the ID lives on books. Additive: existing books get no EEID until an admin runs
-- the backfill from Admin → Edition IDs.

-- ---------------------------------------------------------------------------
-- 1. Editions: grouping, label, EEID, revised-file review, legal removal
-- ---------------------------------------------------------------------------
alter table public.books
  add column work_id               uuid not null default gen_random_uuid(),  -- editions of the same work share this
  add column edition_label         text check (char_length(edition_label) <= 60),  -- e.g. "Second edition"
  add column eeid                  text unique check (eeid ~ '^EEID-[0-9]{4}-[0-9]{6,}$'),
  add column eeid_assigned_at      timestamptz,
  add column eeid_assigned_by      uuid references public.profiles (id) on delete set null,
  add column print_review_requested_at timestamptz,  -- revised print files uploaded while live, not yet approved
  add column removed_at            timestamptz,      -- taken down by our team (e.g. legal); never shown publicly
  add column removed_reason        text check (char_length(removed_reason) <= 500);
create index books_work_idx on public.books (work_id);

-- Every EEID ever issued, kept even if its book is later removed, so an ID is never reused or reassigned
create table public.edition_ids (
  eeid         text primary key check (eeid ~ '^EEID-[0-9]{4}-[0-9]{6,}$'),
  book_id      uuid unique references public.books (id) on delete set null,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references public.profiles (id) on delete set null,
  assigned_via text not null check (assigned_via in ('approval', 'backfill'))
);
alter table public.edition_ids enable row level security;
create policy "edition ids: admin reads" on public.edition_ids for select using (public.is_admin());
-- (writes only through assign_eeid below)

-- Numbers come from a sequence: never count + 1, never reused; gaps are fine
create sequence public.eeid_seq as bigint start 1 no cycle;

-- ---------------------------------------------------------------------------
-- 2. Assignment: server-only, transactional and idempotent
-- ---------------------------------------------------------------------------
-- Locks the book row, so concurrent approvals, retries and double clicks all get the same EEID.
-- The year is the year of assignment in India (Asia/Kolkata). Six digits minimum; grows beyond that.
create or replace function public.assign_eeid(p_book uuid, p_admin uuid, p_via text default 'approval')
returns text language plpgsql security definer set search_path = public as $$
declare
  b public.books;
  n bigint;
  new_eeid text;
begin
  if p_via not in ('approval', 'backfill') then raise exception 'Unknown assignment route'; end if;
  select * into b from public.books where books.id = p_book for update;
  if not found then raise exception 'Book not found'; end if;
  if b.eeid is not null then return b.eeid; end if;
  if b.status = 'draft' then raise exception 'Drafts do not get an Edition ID'; end if;
  if b.removed_at is not null then raise exception 'Removed editions do not get an Edition ID'; end if;
  n := nextval('public.eeid_seq');
  new_eeid := 'EEID-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
        case when n >= 1000000 then n::text else lpad(n::text, 6, '0') end;
  perform set_config('eliphas.assigning_eeid', 'on', true);
  update public.books set eeid = new_eeid, eeid_assigned_at = now(), eeid_assigned_by = p_admin where books.id = p_book;
  perform set_config('eliphas.assigning_eeid', 'off', true);
  insert into public.edition_ids (eeid, book_id, assigned_by, assigned_via) values (new_eeid, p_book, p_admin, p_via);
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (p_admin, 'edition.eeid_assigned', 'book', p_book::text, jsonb_build_object('eeid', new_eeid, 'via', p_via));
  return new_eeid;
end $$;
revoke execute on function public.assign_eeid(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.assign_eeid(uuid, uuid, text) to service_role;

-- EEIDs are immutable: set once by assign_eeid, never changed or cleared, by anyone (admins included)
create or replace function public.guard_eeid()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.eeid is not null or new.eeid_assigned_at is not null or new.eeid_assigned_by is not null then
      raise exception 'Edition IDs are assigned on approval only';
    end if;
    return new;
  end if;
  if old.eeid is not null then
    if new.eeid is distinct from old.eeid or new.eeid_assigned_at is distinct from old.eeid_assigned_at
       or new.eeid_assigned_by is distinct from old.eeid_assigned_by then
      raise exception 'Edition IDs cannot be changed';
    end if;
  elsif (new.eeid is not null or new.eeid_assigned_at is not null or new.eeid_assigned_by is not null)
        and coalesce(current_setting('eliphas.assigning_eeid', true), 'off') <> 'on' then
    raise exception 'Edition IDs are assigned on approval only';
  end if;
  return new;
end $$;
create trigger books_guard_eeid before insert or update on public.books
  for each row execute function public.guard_eeid();

-- Editions with an EEID are never deleted (the ID stays reserved either way, in edition_ids)
create or replace function public.guard_book_delete()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.eeid is not null then raise exception 'Books with an Edition ID cannot be deleted; unpublish or remove them instead'; end if;
  return old;
end $$;
create trigger books_guard_delete before delete on public.books
  for each row execute function public.guard_book_delete();

-- A removed edition can't go live again until our team restores it
create or replace function public.guard_removed_edition()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.removed_at is not null and new.status = 'published' then
    raise exception 'This edition was removed by our team and cannot be published';
  end if;
  if (new.removed_at is distinct from old.removed_at or new.removed_reason is distinct from old.removed_reason)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only our team can remove or restore an edition';
  end if;
  return new;
end $$;
create trigger books_guard_removed before update on public.books
  for each row execute function public.guard_removed_edition();

-- ---------------------------------------------------------------------------
-- 3. Column access (books uses column-level grants since migration 000016)
-- ---------------------------------------------------------------------------
-- Public: the edition's ID, label and grouping. Not public: who assigned it, removal details, review flags.
grant select (work_id, edition_label, eeid, eeid_assigned_at) on public.books to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Revised print cover for a live book (e.g. to add the EEID/QR label)
-- ---------------------------------------------------------------------------
-- The author may add a new print-cover version to a live book. It is stored as a new file (the approved one is
-- kept), flagged for print review, and orders keep printing the approved version until our team approves it.
create or replace function public.can_add_live_print_cover(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.books b
    where b.id::text = (storage.foldername(object_name))[2]
      and b.author_id = auth.uid()
      and (storage.foldername(object_name))[1] = auth.uid()::text
      and b.status = 'published'
      and b.removed_at is null
      and storage.filename(object_name) ~ '^print-cover-[0-9a-f-]{36}\.pdf$'
  )
$$;
create policy "manuscripts: author adds revised print cover to live book" on storage.objects
  for insert to authenticated with check (bucket_id = 'manuscripts' and public.can_add_live_print_cover(name));
-- Uploads use "upsert", which also checks the update rule (each version has a new unique name)
create policy "manuscripts: author upserts revised print cover to live book" on storage.objects
  for update to authenticated using (bucket_id = 'manuscripts' and public.can_add_live_print_cover(name));
