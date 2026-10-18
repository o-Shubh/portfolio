import { Search, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { BookRows } from "@/components/BookCard";
import { BOOK_SORTS, type BookSort, listGenres, listPublishedBooks, PAGE_SIZE } from "@/lib/books";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Bookstore",
  description: "Books by independent authors, printed fresh when you order.",
};

const LANGS = [
  { value: "", label: "All" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
] as const;
const BINDINGS = [
  { value: "", label: "Any binding" },
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
] as const;
const PRICES = [
  { value: "", label: "Any price" },
  { value: "200", label: "Under ₹200" },
  { value: "300", label: "Under ₹300" },
  { value: "500", label: "Under ₹500" },
] as const;

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const lang = sp.lang === "hi" || sp.lang === "en" ? sp.lang : undefined;
  const genre = typeof sp.genre === "string" && sp.genre ? sp.genre : undefined;
  const binding = sp.binding === "paperback" || sp.binding === "hardcover" ? sp.binding : undefined;
  const max = PRICES.some((p) => p.value && p.value === sp.max) ? (sp.max as string) : undefined;
  const sort: BookSort = BOOK_SORTS.some((s) => s.value === sp.sort) ? (sp.sort as BookSort) : "newest";
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ books, total }, genres] = await Promise.all([
    listPublishedBooks({ q, lang, genre, binding, maxPrice: max ? Number(max) : undefined, sort, page }),
    listGenres(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Verified badges come from the author's real verification record, never from the book
  const authorIds = [...new Set(books.map((b) => b.author_id))];
  const verified = new Set<string>();
  if (authorIds.length) {
    const { data } = await createAdminClient().from("public_profiles").select("id, verified_author").in("id", authorIds);
    for (const p of data ?? []) if (p.verified_author && p.id) verified.add(p.id);
  }

  // Build a URL that keeps the other filters
  const current = { q: q || undefined, lang, genre, binding, max, sort: sort === "newest" ? undefined : sort };
  const href = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, page: undefined, ...changes })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/books?${s}` : "/books";
  };
  const filtered = Boolean(binding || max);
  const anyFilter = Boolean(q || lang || genre || binding || max);

  const heading = genre ?? (lang === "hi" ? "Hindi books" : lang === "en" ? "English books" : "Bookstore");

  const filterGroups = (
    <div className="space-y-5">
      <FilterGroup label="Binding" options={BINDINGS} active={binding ?? ""} link={(v) => href({ binding: v || undefined })} />
      <FilterGroup label="Price" options={PRICES} active={max ?? ""} link={(v) => href({ max: v || undefined })} />
      {anyFilter && (
        <Link href="/books" className="btn-ghost w-full text-sm">
          Clear all filters
        </Link>
      )}
    </div>
  );

  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">Bookstore</span>
      </nav>
      <div className="mt-2">
        <h1 className="display text-[1.75rem] md:text-4xl">{q ? `Results for “${q}”` : heading}</h1>
        <p className="mt-1 text-sm text-muted">Books by independent authors. Every copy printed fresh when you order.</p>
      </div>

      {/* Toolbar: search and sort are plain GET forms, so they work before JavaScript loads */}
      <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-2 p-3 md:flex-row md:items-center">
        <form action="/books" role="search" className="flex flex-1 gap-2">
          {lang && <input type="hidden" name="lang" value={lang} />}
          {genre && <input type="hidden" name="genre" value={genre} />}
          {binding && <input type="hidden" name="binding" value={binding} />}
          {max && <input type="hidden" name="max" value={max} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <label htmlFor="q" className="sr-only">
            Search by title or author
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Search title or author" className="field pl-10" />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
        <form action="/books" className="flex items-center gap-2">
          {Object.entries(current).map(([k, v]) => (k !== "sort" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <label htmlFor="sort" className="shrink-0 text-sm text-muted">
            Sort
          </label>
          <AutoSubmitSelect id="sort" name="sort" defaultValue={sort} className="field w-auto min-w-44 pr-8">
            {BOOK_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </AutoSubmitSelect>
          <noscript>
            <button type="submit" className="btn-ghost">
              Apply
            </button>
          </noscript>
        </form>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="segmented shrink-0 self-start" aria-label="Language">
          {LANGS.map((l) => (
            <Link key={l.value} href={href({ lang: l.value || undefined })} aria-current={(lang ?? "") === l.value ? "true" : undefined} className="segment px-4">
              {l.label}
            </Link>
          ))}
        </div>
        {genres.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" aria-label="Genre">
            <Link href={href({ genre: undefined })} aria-current={!genre ? "true" : undefined} className="chip bg-surface">
              All genres
            </Link>
            {genres.map((g) => (
              <Link key={g} href={href({ genre: g })} aria-current={genre === g ? "true" : undefined} className="chip bg-surface">
                {g}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-8">
        <aside aria-label="Filters" className="hidden lg:block">
          <h2 className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Filters</h2>
          <div className="mt-3">{filterGroups}</div>
        </aside>

        <div>
          {/* Phones and tablets: the same filters in a disclosure */}
          <details className="group mb-4 lg:hidden" open={filtered || undefined}>
            <summary className="btn-ghost w-full cursor-pointer list-none text-sm [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters{filtered ? " (on)" : ""}
            </summary>
            <div className="mt-3 rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">{filterGroups}</div>
          </details>

          <p className="text-sm text-muted" aria-live="polite">
            {total === 1 ? "1 book" : `${total} books`}
            {q && <> for “{q}”</>}
            {pages > 1 && ` · page ${page} of ${pages}`}
          </p>

          <div className="mt-3">
            {books.length ? (
              <BookRows books={books} verified={verified} />
            ) : (
              <div className="rounded-[var(--radius-card)] bg-surface px-6 py-16 text-center ring-1 ring-line">
                <p className="display text-xl">No books found</p>
                <p className="mt-2 text-muted">Try a different word, or clear the filters.</p>
                <Link href="/books" className="btn-ghost mt-6">
                  Clear filters
                </Link>
              </div>
            )}
          </div>

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
              {page > 1 && (
                <Link className="btn-ghost px-3 text-sm" href={href({ page: String(page - 1) })}>
                  Previous
                </Link>
              )}
              {pageList(page, pages).map((n, i) =>
                n === null ? (
                  <span key={`gap${i}`} className="px-1 text-muted" aria-hidden>
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={href({ page: n === 1 ? undefined : String(n) })}
                    aria-current={n === page ? "page" : undefined}
                    aria-label={`Page ${n}`}
                    className="mono inline-flex h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] text-sm hover:bg-surface-2 aria-[current=page]:bg-primary aria-[current=page]:text-on-primary pointer-fine:h-9 pointer-fine:min-w-9"
                  >
                    {n}
                  </Link>
                ),
              )}
              {page < pages && (
                <Link className="btn-ghost px-3 text-sm" href={href({ page: String(page + 1) })}>
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/** 1 … 4 5 6 … 12 */
function pageList(page: number, pages: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) out.push(n);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}

function FilterGroup({
  label,
  options,
  active,
  link,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  active: string;
  link: (value: string) => string;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-medium">{label}</h3>
      <ul className="group-list" aria-label={label}>
        {options.map((o) => (
          <li key={o.value}>
            <Link
              href={link(o.value)}
              aria-current={active === o.value ? "true" : undefined}
              className="flex min-h-11 items-center justify-between px-3.5 text-sm hover:bg-surface-2 aria-[current=true]:font-medium pointer-fine:min-h-9"
            >
              {o.label}
              {active === o.value && (
                <span className="text-primary dark:text-accent-fg" aria-hidden>
                  ✓
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
