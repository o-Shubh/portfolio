-- Writing Studio, foundation.
-- An AI book-writing studio: a team of Claude agents helps an author go from idea to blueprint to approved chapters
-- to an exported manuscript, with the author approving every chapter.
--
-- Privacy and security, in one place:
--   * Every studio table carries book_id, and one helper (studio_owns_book) decides who may read it: the book's
--     author only. Admins can read metadata (books, jobs, costs, plans), never manuscript text.
--   * Signed-in users can only READ. Every write goes through the server (after an ownership check) or a
--     background job, using the service role. A leaked browser key can't change anything.
--   * Chapter versions are never deleted or changed: rollback adds a new version.
--   * Deleting a book deletes its manuscript; job rows stay for cost records, with their inputs and outputs wiped.
-- Names start with studio_ because public.books already means published books (printing and bookstore).
-- studio_books.published_book_id is the future "send to print" link to those books.

-- ---------------------------------------------------------------------------
-- 1. Books, voice samples, blueprint
-- ---------------------------------------------------------------------------
create table public.studio_books (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (length(title) between 1 and 200),
  idea              text not null default '' check (length(idea) <= 4000),
  genre             text not null default '' check (length(genre) <= 80),
  language          text not null default 'en' check (language in ('en', 'hi')),
  target_reader     text not null default '' check (length(target_reader) <= 1000),
  target_words      integer check (target_words between 5000 and 300000),
  status            text not null default 'setup' check (status in ('setup', 'blueprint', 'writing', 'review', 'complete')),
  ai_disclosure     text check (length(ai_disclosure) <= 2000),
  published_book_id uuid references public.books (id) on delete set null,   -- later: sent to print / bookstore
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index studio_books_author_idx on public.studio_books (author_id, updated_at desc);
create trigger studio_books_touch before update on public.studio_books for each row execute function public.touch_updated_at();

create table public.studio_voice_samples (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.studio_books (id) on delete cascade,
  position   smallint not null check (position between 1 and 3),
  text       text not null check (length(text) between 100 and 20000),
  created_at timestamptz not null default now(),
  unique (book_id, position)
);

create table public.studio_blueprints (
  book_id        uuid primary key references public.studio_books (id) on delete cascade,
  thesis         text not null default '',
  reader_profile text not null default '',
  outline        jsonb not null default '[]',      -- the Architect's proposal, kept as it was generated
  job_id         uuid,
  locked_at      timestamptz,                      -- once locked, the chapters below are the plan
  updated_at     timestamptz not null default now()
);
create trigger studio_blueprints_touch before update on public.studio_blueprints for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Chapters and their versions (every draft kept)
-- ---------------------------------------------------------------------------
create table public.studio_chapters (
  id                 uuid primary key default gen_random_uuid(),
  book_id            uuid not null references public.studio_books (id) on delete cascade,
  number             integer not null check (number >= 1),
  title              text not null check (length(title) between 1 and 200),
  goal               text not null default '' check (length(goal) <= 2000),
  status             text not null default 'not_started'
                       check (status in ('not_started', 'drafting', 'in_review', 'approved', 'locked')),
  current_version_id uuid,
  summary            text,                         -- short summary after approval; feeds the next chapter
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (book_id, number) deferrable initially deferred   -- reordering swaps numbers inside one transaction
);
create trigger studio_chapters_touch before update on public.studio_chapters for each row execute function public.touch_updated_at();

create table public.studio_chapter_versions (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.studio_books (id) on delete cascade,
  chapter_id uuid not null references public.studio_chapters (id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  content    jsonb,                                -- the editor's document
  text       text not null default '',             -- plain text for the agents and word counts
  source     text not null check (source in ('writer', 'revise', 'author_edit', 'rollback')),
  word_count integer not null default 0,
  job_id     uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (chapter_id, version_no)
);
create index studio_versions_chapter_idx on public.studio_chapter_versions (chapter_id, version_no desc);
alter table public.studio_chapters
  add constraint studio_chapters_current_version_fkey foreign key (current_version_id)
  references public.studio_chapter_versions (id) on delete set null;

-- Versions are final: never changed, never deleted while their chapter exists (deleting the book removes them)
create function public.studio_versions_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Chapter versions cannot be changed. Save a new version instead.';
  end if;
  if exists (select 1 from public.studio_chapters where id = old.chapter_id) then
    raise exception 'Chapter versions are never deleted. Roll back to an earlier version instead.';
  end if;
  return old;
end $$;
create trigger studio_versions_guard before update or delete on public.studio_chapter_versions
  for each row execute function public.studio_versions_guard();

create table public.studio_research_notes (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.studio_books (id) on delete cascade,
  chapter_id uuid not null references public.studio_chapters (id) on delete cascade,
  content    jsonb not null,                       -- examples, facts, stories, each flagged verified / check / weak
  job_id     uuid,
  created_at timestamptz not null default now()
);
create index studio_research_chapter_idx on public.studio_research_notes (chapter_id, created_at desc);

create table public.studio_reviews (
  id               uuid primary key default gen_random_uuid(),
  book_id          uuid not null references public.studio_books (id) on delete cascade,
  chapter_id       uuid references public.studio_chapters (id) on delete cascade,           -- null for full-book reviews
  version_id       uuid references public.studio_chapter_versions (id) on delete cascade,
  role             text not null check (role in ('editor', 'voice_keeper', 'critic', 'final_editor', 'final_critic')),
  notes            jsonb not null default '[]',    -- [{id, severity, quote, note, suggestion}]
  applied_note_ids text[] not null default '{}',
  job_id           uuid,
  created_at       timestamptz not null default now()
);
create index studio_reviews_version_idx on public.studio_reviews (version_id);

-- ---------------------------------------------------------------------------
-- 3. Book bible (updated after each approved chapter, with history)
-- ---------------------------------------------------------------------------
create table public.studio_book_bible (
  book_id               uuid primary key references public.studio_books (id) on delete cascade,
  themes                jsonb not null default '[]',
  key_terms             jsonb not null default '[]',
  stories_used          jsonb not null default '[]',
  promises              jsonb not null default '[]',
  updated_after_chapter integer,
  updated_at            timestamptz not null default now()
);
create trigger studio_bible_touch before update on public.studio_book_bible for each row execute function public.touch_updated_at();

create table public.studio_book_bible_history (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references public.studio_books (id) on delete cascade,
  snapshot       jsonb not null,
  chapter_number integer,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Agent jobs (one row per background step, with tokens and cost)
-- ---------------------------------------------------------------------------
create table public.studio_agent_jobs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.profiles (id) on delete set null,
  book_id            uuid references public.studio_books (id) on delete set null,     -- kept for cost records
  chapter_id         uuid references public.studio_chapters (id) on delete set null,
  type               text not null check (type in ('architect', 'researcher', 'writer', 'revise', 'editor', 'voice_keeper',
                                                   'critic', 'continuity', 'chapter_summary', 'final_review', 'export')),
  status             text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  progress           jsonb not null default '{}',  -- {step, message, words}
  input              jsonb not null default '{}',
  output             jsonb,
  model              text,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cache_read_tokens  integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd_micros    bigint not null default 0,    -- millionths of a US dollar
  attempts           integer not null default 0,
  error              text check (length(error) <= 500),     -- shown to the author
  error_detail       text check (length(error_detail) <= 4000),  -- admins only
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz
);
create index studio_jobs_book_idx on public.studio_agent_jobs (book_id, created_at desc);
create index studio_jobs_status_idx on public.studio_agent_jobs (status, created_at desc);

-- Deleting a book removes its manuscript everywhere: job inputs and outputs are wiped, costs stay
create function public.studio_books_wipe_jobs() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.studio_agent_jobs set input = '{}', output = null, progress = '{}' where book_id = old.id;
  return old;
end $$;
create trigger studio_books_wipe_jobs before delete on public.studio_books for each row execute function public.studio_books_wipe_jobs();

-- ---------------------------------------------------------------------------
-- 5. Plans: usage ledger, subscriptions, per-book packs (payments go in public.payments → automatic invoices)
-- ---------------------------------------------------------------------------
create table public.studio_usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  book_id    uuid references public.studio_books (id) on delete set null,
  chapter_id uuid references public.studio_chapters (id) on delete set null,
  job_id     uuid references public.studio_agent_jobs (id) on delete set null,
  kind       text not null check (kind in ('blueprint', 'chapter', 'revision', 'final_review')),
  status     text not null default 'reserved' check (status in ('reserved', 'used', 'released')),
  created_at timestamptz not null default now()
);
create index studio_usage_user_idx on public.studio_usage_events (user_id, created_at desc);

alter table public.payments drop constraint payments_purpose_check;
alter table public.payments add constraint payments_purpose_check check (purpose in ('subscription', 'service', 'studio'));

create table public.studio_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  plan       text not null check (plan in ('writer', 'pro')),
  status     text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'refunded')),
  starts_at  timestamptz,
  ends_at    timestamptz,
  payment_id uuid unique references public.payments (id),
  created_at timestamptz not null default now(),
  check (status <> 'active' or (starts_at is not null and ends_at > starts_at))
);
create index studio_subscriptions_user_idx on public.studio_subscriptions (user_id, ends_at desc);

create table public.studio_book_packs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  book_id    uuid references public.studio_books (id) on delete set null,
  status     text not null default 'pending' check (status in ('pending', 'active', 'refunded')),
  payment_id uuid unique references public.payments (id),
  created_at timestamptz not null default now()
);

-- Studio settings, edited in Admin (prices and limits are yours to set; the Studio is closed until you open it)
insert into public.settings (key, value, description) values (
  'studio',
  '{"open": false, "usd_inr": null, "revision_limit": 5,
    "plans": {
      "free":   {"blueprints": 1, "chapters": 1},
      "writer": {"price_paise": null, "monthly_chapters": 20, "final_review": false},
      "pro":    {"price_paise": null, "monthly_chapters": 60, "final_review": true},
      "pack":   {"price_paise": null, "final_review": true}
    }}'::jsonb,
  'Writing Studio: open to authors or admins only, plan prices (paise, before GST) and limits, revisions per chapter, and the USD to INR rate for cost reports.'
) on conflict (key) do nothing;

-- Finished exports (.docx, .pdf, .epub): private, downloaded through short-lived signed links
insert into storage.buckets (id, name, public) values ('studio-exports', 'studio-exports', false) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Row-level security: the author reads their own books; admins read metadata; nobody writes from the browser
-- ---------------------------------------------------------------------------
create function public.studio_owns_book(p_book uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.studio_books where id = p_book and author_id = auth.uid())
$$;
revoke execute on function public.studio_owns_book(uuid) from public, anon;
grant execute on function public.studio_owns_book(uuid) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['studio_books', 'studio_voice_samples', 'studio_blueprints', 'studio_chapters',
                           'studio_chapter_versions', 'studio_research_notes', 'studio_reviews', 'studio_book_bible',
                           'studio_book_bible_history', 'studio_agent_jobs', 'studio_usage_events',
                           'studio_subscriptions', 'studio_book_packs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Authors: read their own (text tables have no admin policy: manuscripts stay private)
grant select on public.studio_books, public.studio_voice_samples, public.studio_blueprints, public.studio_chapters,
  public.studio_chapter_versions, public.studio_research_notes, public.studio_reviews, public.studio_book_bible,
  public.studio_book_bible_history, public.studio_usage_events, public.studio_subscriptions, public.studio_book_packs
  to authenticated;
-- Jobs: everything except the cost and the technical error (admins only)
grant select (id, user_id, book_id, chapter_id, type, status, progress, input, output, model, attempts, error,
              created_at, started_at, finished_at) on public.studio_agent_jobs to authenticated;

create policy "studio books: author reads" on public.studio_books for select to authenticated using (author_id = auth.uid());
create policy "studio books: admin reads" on public.studio_books for select to authenticated using (public.is_admin());
create policy "studio voice: author reads" on public.studio_voice_samples for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio blueprints: author reads" on public.studio_blueprints for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio chapters: author reads" on public.studio_chapters for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio versions: author reads" on public.studio_chapter_versions for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio research: author reads" on public.studio_research_notes for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio reviews: author reads" on public.studio_reviews for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio bible: author reads" on public.studio_book_bible for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio bible history: author reads" on public.studio_book_bible_history for select to authenticated using (public.studio_owns_book(book_id));
create policy "studio jobs: author reads" on public.studio_agent_jobs for select to authenticated using (user_id = auth.uid() and public.studio_owns_book(book_id));
create policy "studio jobs: admin reads" on public.studio_agent_jobs for select to authenticated using (public.is_admin());
create policy "studio usage: user reads" on public.studio_usage_events for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "studio subscriptions: user reads" on public.studio_subscriptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "studio packs: user reads" on public.studio_book_packs for select to authenticated using (user_id = auth.uid() or public.is_admin());
