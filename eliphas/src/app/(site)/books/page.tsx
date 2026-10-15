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

  const heading = genre ?? (lang === "hi" ? "Hindi books" : lang === "en" ? "English books" : "All books");

  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">Bookstore</span>
      </nav>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl">{q ? `Results for “${q}”` : heading}</h1>
          <p className="mt-1 text-sm text-muted">Every copy printed fresh when you order.</p>
        </div>
        {/* A plain GET form: works even before JavaScript loads */}
        <form action="/books" role="search" className="flex w-full gap-2 md:max-w-sm">
          {lang && <input type="hidden" name="lang" value={lang} />}
          {genre && <input type="hidden" name="genre" value={genre} />}
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
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-surface p-3 shadow-soft ring-1 ring-line lg:flex-row lg:items-center">
        <div className="flex shrink-0 rounded-lg bg-surface-2 p-1" aria-label="Language">
          {LANGS.map((l) => {
            const active = (lang ?? "") === l.value;
            return (
              <Link
                key={l.value}
                href={href({ lang: l.value || undefined, page: undefined })}
                aria-current={active ? "true" : undefined}
                className={`inline-flex h-8 items-center rounded-md px-4 text-sm transition ${
                  active ? "bg-primary font-medium text-on-primary" : "text-muted hover:text-fg"
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

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {total === 1 ? "1 book" : `${total} books`}
        {q && <> for “{q}”</>}
      </p>

      <div className="mt-3">
        {books.length ? (
          <BookGrid books={books} />
        ) : (
          <div className="rounded-xl bg-surface px-6 py-16 text-center shadow-soft ring-1 ring-line">
            <p className="text-xl font-semibold">No books found</p>
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
        active ? "border-gold bg-gold font-medium text-navy" : "border-line-strong text-fg hover:border-gold"
      }`}
    >
      {label}
    </Link>
  );
}
