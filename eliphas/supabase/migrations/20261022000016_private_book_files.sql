-- Private file locations on books (manuscript, print cover, sample draft, approved file pins) are no longer
-- readable through the public API. The files were already in a private bucket; now their paths are hidden too.
-- Everything else on a book stays readable under the existing row rules. The app reads these four columns
-- on the server only, after checking the person is the book's author or an admin.
revoke select on public.books from anon, authenticated;
grant select (
  id, author_id, slug, title, subtitle, author_name, description, language, genre, isbn, page_count, trim_size,
  binding, interior, paper, cover_finish, mrp, print_cost, cover_path, status, review_note, reviewed_by,
  reviewed_at, submitted_at, published_at, created_at, updated_at, manuscript_width_in, manuscript_height_in,
  print_cover_width_in, print_cover_height_in, sample_path, sample_from, sample_to, approved_files_at,
  files_confirmed_at, sample_draft_from, sample_draft_to, sample_draft_source, sample_source,
  sample_manuscript_version, sample_approved_at
) on public.books to anon, authenticated;
