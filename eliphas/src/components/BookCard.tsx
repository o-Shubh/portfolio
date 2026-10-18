import { BookOpen } from "lucide-react";
import Link from "next/link";
import { BINDING_LABEL, coverUrl, LANGUAGE_LABEL, type PublicBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { AddToCartButton } from "./AddToCartButton";
import { BookCover } from "./BookCover";
import { VerifiedBadge } from "./VerifiedBadge";

/**
 * Catalogue tile: white card with a hairline, the cover in an ivory well, serif title, author, price and a
 * compact Add to cart. The whole card opens the book (title link stretched over it); Add stays its own button.
 */
export function BookCard({ book, priority, showAdd = true }: { book: PublicBook; priority?: boolean; showAdd?: boolean }) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-line transition-shadow hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus">
      <div className="bg-ivory px-[16%] pt-[12%] pb-[10%]">
        <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" priority={priority} />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-xs text-muted">{book.author_name}</p>
        <h3 className="mt-0.5 line-clamp-2 font-serif text-[0.98rem] leading-snug font-semibold tracking-normal" lang={book.language}>
          <Link href={`/books/${book.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {book.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <p className="flex items-baseline gap-1.5">
            <span className="mono text-[0.95rem] font-medium">{rupees(Number(book.mrp))}</span>
            <span className="text-[0.7rem] text-muted">{LANGUAGE_LABEL[book.language]}</span>
          </p>
          {showAdd && <AddToCartButton bookId={book.id} compact title={book.title} className="relative z-10 min-h-11 px-3 text-xs pointer-fine:min-h-8 pointer-fine:px-2.5" />}
        </div>
      </div>
    </div>
  );
}

export function BookGrid({ books }: { books: PublicBook[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {books.map((b, i) => (
        <li key={b.id}>
          <BookCard book={b} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

/** A horizontal row of product cards that scrolls sideways. */
export function BookShelf({ books, eager = false }: { books: PublicBook[]; eager?: boolean }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8">
      {books.map((b, i) => (
        <li key={b.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] md:w-[22%] lg:w-[calc((100%-4rem)/5)]">
          <BookCard book={b} priority={eager && i < 4} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Bookstore result row: cover on the left, edition tags, serif title, author (with the Verified badge when our
 * team verified them), price and the three real actions: Read sample (only when one is published), Buy now, Add.
 */
export function BookRow({ book, verified, priority }: { book: PublicBook; verified?: boolean; priority?: boolean }) {
  const specs = [BINDING_LABEL[book.binding] ?? book.binding, book.page_count ? `${book.page_count} pages` : null, LANGUAGE_LABEL[book.language]].filter(Boolean);
  return (
    <article className="flex h-full gap-4 rounded-[var(--radius-card)] bg-surface p-3 ring-1 ring-line transition-shadow hover:shadow-lift sm:gap-5 sm:p-4">
      <Link href={`/books/${book.slug}`} tabIndex={-1} aria-hidden className="w-24 shrink-0 self-start rounded-lg bg-ivory p-2.5 sm:w-32 sm:p-3">
        <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" priority={priority} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        {(book.eeid || book.isbn) && (
          <p className="flex flex-wrap gap-1.5 text-[0.7rem] text-muted">
            {book.eeid && <span className="mono rounded bg-surface-2 px-1.5 py-0.5">EEID {book.eeid}</span>}
            {book.isbn && <span className="mono rounded bg-surface-2 px-1.5 py-0.5">ISBN {book.isbn}</span>}
          </p>
        )}
        <h3 className="mt-1.5 font-serif text-lg leading-snug font-semibold tracking-normal sm:text-xl" lang={book.language}>
          <Link href={`/books/${book.slug}`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            {book.title}
          </Link>
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <span className="truncate">{book.author_name}</span>
          {verified && <VerifiedBadge compact />}
        </p>
        {book.description && (
          <p className="mt-2 line-clamp-2 text-sm text-fg/90 max-sm:hidden" lang={book.language}>
            {book.description}
          </p>
        )}
        <div className="mt-auto pt-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="mono text-lg font-medium">{rupees(Number(book.mrp))}</span>
            <span className="text-xs text-muted">Inclusive of all taxes</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">{specs.join(" · ")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {book.sample_path && (
              <Link href={`/books/${book.slug}/sample`} className="btn-tinted min-h-11 px-3 text-sm pointer-fine:min-h-9">
                <BookOpen className="h-4 w-4" aria-hidden /> Sample
                <span className="sr-only"> of {book.title}</span>
              </Link>
            )}
            <Link href={`/checkout/${book.slug}`} className="btn-accent min-h-11 px-3 text-sm pointer-fine:min-h-9">
              Buy now<span className="sr-only">: {book.title}</span>
            </Link>
            <AddToCartButton bookId={book.id} compact title={book.title} className="min-h-11 px-3 text-sm pointer-fine:min-h-9" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function BookRows({ books, verified }: { books: PublicBook[]; verified: Set<string> }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
      {books.map((b, i) => (
        <li key={b.id}>
          <BookRow book={b} verified={verified.has(b.author_id)} priority={i < 3} />
        </li>
      ))}
    </ul>
  );
}
