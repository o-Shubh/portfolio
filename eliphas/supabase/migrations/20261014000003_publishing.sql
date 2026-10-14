-- Milestone 3: author publishing flow

-- Page size of the uploaded manuscript PDF (inches), read in the browser on upload.
-- Used to warn the author if it doesn't match the chosen book size.
alter table public.books
  add column manuscript_width_in  numeric(5, 2),
  add column manuscript_height_in numeric(5, 2);

-- Physical size of each trim option, for that comparison.
update public.settings
set value = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(value,
  '{trim_sizes,5x8}',     value -> 'trim_sizes' -> '5x8'     || '{"width_in": 5,    "height_in": 8}'),
  '{trim_sizes,5.5x8.5}', value -> 'trim_sizes' -> '5.5x8.5' || '{"width_in": 5.5,  "height_in": 8.5}'),
  '{trim_sizes,a5}',      value -> 'trim_sizes' -> 'a5'      || '{"width_in": 5.83, "height_in": 8.27}'),
  '{trim_sizes,6x9}',     value -> 'trim_sizes' -> '6x9'     || '{"width_in": 6,    "height_in": 9}'),
  '{trim_sizes,8.5x11}',  value -> 'trim_sizes' -> '8.5x11'  || '{"width_in": 8.5,  "height_in": 11}')
where key = 'print_rates'
  and value -> 'trim_sizes' ?& array['5x8', '5.5x8.5', 'a5', '6x9', '8.5x11'];

-- ---------------------------------------------------------------------------
-- Storage: files live at <author_id>/<book_id>/<file>. Authors may only change
-- files of their own books, and only while the book is editable. Once a book is
-- in review or published, its files are frozen, so what the admin approved is
-- exactly what the printer prints.
-- ---------------------------------------------------------------------------
create function public.can_edit_book_files(object_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.books b
    where b.id::text = (storage.foldername(object_name))[2]
      and b.author_id = auth.uid()
      and (storage.foldername(object_name))[1] = auth.uid()::text
      and b.status in ('draft', 'changes_requested', 'unpublished')
  )
$$;

drop policy "manuscripts: author uploads own folder" on storage.objects;
drop policy "manuscripts: author updates own folder" on storage.objects;
drop policy "manuscripts: author deletes own" on storage.objects;
drop policy "covers: author uploads own folder" on storage.objects;
drop policy "covers: author updates own folder" on storage.objects;
drop policy "covers: author deletes own" on storage.objects;

create policy "manuscripts: author uploads to editable book" on storage.objects
  for insert to authenticated with check (bucket_id = 'manuscripts' and public.can_edit_book_files(name));
create policy "manuscripts: author replaces in editable book" on storage.objects
  for update to authenticated using (bucket_id = 'manuscripts' and public.can_edit_book_files(name));
create policy "manuscripts: author deletes from editable book" on storage.objects
  for delete to authenticated using (bucket_id = 'manuscripts' and public.can_edit_book_files(name));

create policy "covers: author uploads to editable book" on storage.objects
  for insert to authenticated with check (bucket_id = 'covers' and public.can_edit_book_files(name));
create policy "covers: author replaces in editable book" on storage.objects
  for update to authenticated using (bucket_id = 'covers' and public.can_edit_book_files(name));
create policy "covers: author deletes from editable book" on storage.objects
  for delete to authenticated using (bucket_id = 'covers' and public.can_edit_book_files(name));
-- Replacing a file ("upsert") also needs read access through the API.
create policy "covers: author reads own folder" on storage.objects
  for select to authenticated using (
    bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text
  );
