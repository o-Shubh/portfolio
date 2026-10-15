import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookGrid } from "@/components/BookCard";
import { listGenres, listPublishedBooks, PAGE_SIZE } from "@/lib/books";

export const metadata: Metadata = {
  title: "Bookstore",
  description: "Books by independent authors, printed fresh when you order.",
};

const LANGS = [
  { value: "", label: "All" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
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
    <div className="container-x py-10 md:py-14">
      <div className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Bookstore</p>
          <h1 className="mt-3 text-5xl md:text-6xl">Discover independent books</h1>
          <p className="mt-3 max-w-xl text-muted">Every copy is printed fresh when you order it.</p>
        </div>

        {/* A plain GET form: works even before JavaScript loads */}
        <form action="/books" role="search" className="flex w-full gap-2 md:max-w-md">
          {lang && <input type="hidden" name="lang" value={lang} />}
          {genre && <input type="hidden" name="genre" value={genre} />}
          <label htmlFor="q" className="sr-only">
            Search by title or author
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden />
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Search title or author" className="field rounded-full pl-10" />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex shrink-0 rounded-full bg-surface-2 p-1" aria-label="Language">
          {LANGS.map((l) => {
            const active = (lang ?? "") === l.value;
            return (
              <Link
                key={l.value}
                href={href({ lang: l.value || undefined, page: undefined })}
                aria-current={active ? "true" : undefined}
                className={`inline-flex h-8 items-center rounded-full px-4 text-sm transition ${
                  active ? "bg-surface font-medium text-fg shadow-soft ring-1 ring-line" : "text-muted hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {genres.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" aria-label="Genre">
            <GenreChip href={href({ genre: undefined, page: undefined })} active={!genre} label="All genres" />
            {genres.map((g) => (
              <GenreChip key={g} href={href({ genre: g, page: undefined })} active={genre === g} label={g} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-muted" aria-live="polite">
        {total === 1 ? "1 book" : `${total} books`}
        {q && <> for “{q}”</>}
      </p>

      <div className="mt-5">
        {books.length ? (
          <BookGrid books={books} />
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="font-heading text-2xl">No books found</p>
            <p className="mt-2 text-muted">Try a different word, or clear the filters.</p>
            <Link href="/books" className="btn-ghost mt-6">
              Clear filters
            </Link>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-14 flex items-center justify-center gap-3">
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
      className={`inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm transition ${
        active ? "border-fg bg-fg text-bg" : "border-line text-fg hover:border-fg"
      }`}
    >
      {label}
    </Link>
  );
}
