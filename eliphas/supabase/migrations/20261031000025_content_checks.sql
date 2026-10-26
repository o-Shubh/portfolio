-- Content checks and the 18+ label.
-- Every manuscript goes through seven automatic checks before it can be sent for review (readable file, abusive
-- language, hate speech, sexual content, violence and self-harm, personal data, professional quality). The checks
-- never publish or reject by themselves: they tell the author what to fix and show our reviewers what was found.
-- Books with mature themes carry an 18+ label and are shown only to readers who confirm they are 18 or older.

-- ---------------------------------------------------------------------------
-- 1. Audience label and the author's note to reviewers
-- ---------------------------------------------------------------------------
alter table public.books
  add column age_rating text not null default 'general' check (age_rating in ('general', 'mature')),
  add column content_note text check (length(content_note) <= 1000);  -- why flagged content is there (e.g. a quote in context)

-- Public: the label (stores filter on it). Not public: the note to reviewers.
grant select (age_rating) on public.books to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Check results: one row per manuscript file checked
-- ---------------------------------------------------------------------------
create table public.manuscript_checks (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.books (id) on delete cascade,
  manuscript_path text not null,
  status          text not null check (status in ('done', 'error')),
  overall         text not null check (overall in ('pass', 'review', 'blocked')),
  results         jsonb not null default '[]',   -- the seven checks: key, status, count, detail, examples (page + masked text)
  pages           integer,
  words           integer,
  error           text check (length(error) <= 500),
  created_at      timestamptz not null default now(),
  unique (book_id, manuscript_path)
);
create index manuscript_checks_book_idx on public.manuscript_checks (book_id, created_at desc);
alter table public.manuscript_checks enable row level security;
create policy "manuscript checks: author and admin read" on public.manuscript_checks for select to authenticated
  using (public.is_admin() or exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Words and phrases our team adds to the built-in lists (or allows, to stop false alarms)
-- ---------------------------------------------------------------------------
create table public.content_terms (
  term       text not null check (length(term) between 2 and 80),
  category   text not null check (category in ('language', 'hate', 'adult', 'violence', 'allow')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (term, category)
);
alter table public.content_terms enable row level security;
create policy "content terms: admin" on public.content_terms for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Readers who confirmed they are 18 or older (to see and buy 18+ books)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column adult_confirmed_at timestamptz;
