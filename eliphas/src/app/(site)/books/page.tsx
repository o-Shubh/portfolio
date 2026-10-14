import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookGrid } from "@/components/BookCard";
import { listGenres, listPublishedBooks, PAGE_SIZE } from "@/lib/books";

export const metadata: Metadata = {
  title: "Bookstore",
  description: "Hindi and English books by independent Indian authors, printed on order and delivered across India.",
};

const LANGS = [
  { value: "", label: "All" },
  { value: "hi", label: "हिन्दी" },
  { value: "en", label: "English" },
] as const;

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const lang = sp.lang === "hi" || sp.lang === "en" ? sp.lang : undefined;
  const genre = typeof sp.genre === "string" && sp.genre ? sp.genre : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ books, total }, genres] = await Promise.all([listPublishedBooks({ q, lang, genre, page }), listGenres()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build a URL that keeps the other filters
  const href = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: q || undefined, lang, genre, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/books?${s}` : "/books";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold md:text-4xl">Bookstore</h1>
      <p className="mt-1 text-muted">Books by independent Indian authors. Every copy printed fresh when you order.</p>

      {/* A plain GET form: works even before JavaScript loads */}
      <form action="/books" role="search" className="mt-6 flex gap-2">
        {lang && <input type="hidden" name="lang" value={lang} />}
        {genre && <input type="hidden" name="genre" value={genre} />}
        <label htmlFor="q" className="sr-only">
          Search by title or author
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search title or author / शीर्षक या लेखक"
            className="field pl-11"
          />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Language">
        {LANGS.map((l) => {
          const active = (lang ?? "") === l.value;
          return (
            <Link
              key={l.value}
              href={href({ lang: l.value || undefined, page: undefined })}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${
                active ? "border-marigold bg-marigold text-on-marigold" : "border-line text-fg hover:bg-surface-2"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {genres.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Genre">
          <GenreChip href={href({ genre: undefined, page: undefined })} active={!genre} label="All genres" />
          {genres.map((g) => (
            <GenreChip key={g} href={href({ genre: g, page: undefined })} active={genre === g} label={g} />
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {total === 1 ? "1 book" : `${total} books`}
        {q && <> for “{q}”</>}
      </p>

      <div className="mt-4">
        {books.length ? (
          <BookGrid books={books} />
        ) : (
          <div className="card text-center">
            <p className="font-semibold">No books found.</p>
            <p className="mt-1 text-muted">Try a different word, or clear the filters.</p>
            <Link href="/books" className="btn-ghost mt-4">
              Clear filters
            </Link>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={href({ page: String(page - 1) })}>
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={href({ page: String(page + 1) })}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function GenreChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm ${
        active ? "bg-primary text-on-primary" : "bg-surface-2 text-fg hover:opacity-80"
      }`}
    >
      {label}
    </Link>
  );
}
