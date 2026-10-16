-- Profile photos and book "Read sample" pages.
--
-- Photos: people upload a photo; the server checks it, crops it square, re-encodes it as WebP (which drops
-- EXIF/GPS) and stores it in the public "avatars" bucket. Only the server writes there.
-- Samples: an author chooses a short run of pages from their own manuscript (at most 10% of the book, up to
-- 30 pages). The server copies just those pages into a new PDF in the public "book-samples" bucket. The
-- manuscript itself stays private.

alter table public.profiles
  add column avatar_path text check (char_length(avatar_path) <= 300);

-- Public author details now include the photo (still never phone or address)
create or replace view public.public_authors with (security_invoker = false) as
  select id, handle, full_name, bio, avatar_path from public.profiles where role in ('author', 'admin') and handle is not null;
grant select on public.public_authors to anon, authenticated;

alter table public.books
  add column sample_path  text check (char_length(sample_path) <= 300),
  add column sample_from  integer check (sample_from >= 1),
  add column sample_to    integer,
  add constraint books_sample_range check (
    (sample_path is null and sample_from is null and sample_to is null)
    or (sample_path is not null and sample_from is not null and sample_to >= sample_from and sample_to - sample_from < 30)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 524288, array['image/webp']),
  ('book-samples', 'book-samples', true, 15728640, array['application/pdf'])
on conflict (id) do nothing;
