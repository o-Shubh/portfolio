-- Split the cover in two:
--   cover_path        front cover IMAGE in the public "covers" bucket (shown in the bookstore)
--   print_cover_path  full-wrap print PDF (back + spine + front) in the private "manuscripts" bucket
alter table public.books
  add column print_cover_path      text,
  add column print_cover_width_in  numeric(5, 2),
  add column print_cover_height_in numeric(5, 2);

-- The public bucket now only takes images
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'covers';

-- Spine thickness per page (mm) for each paper, and bleed (inches) around the full cover.
-- SAMPLE values: ask the printer for their exact paper thickness.
update public.settings
set value = jsonb_set(
      jsonb_set(
        jsonb_set(value, '{paper,cream}', value -> 'paper' -> 'cream' || '{"spine_mm_per_page": 0.055}'),
        '{paper,white}', value -> 'paper' -> 'white' || '{"spine_mm_per_page": 0.06}'),
      '{cover_bleed_in}', '0.125')
where key = 'print_rates'
  and value -> 'paper' ?& array['cream', 'white'];
