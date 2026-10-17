import Link from "next/link";
import { coverUrl, LANGUAGE_LABEL, type PublicBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { BookCover } from "./BookCover";

/** A product card: cover, title, author, price. */
export function BookCard({ book, priority }: { book: PublicBook; priority?: boolean }) {
  return (
    <Link href={`/books/${book.slug}`} className="group flex h-full flex-col rounded-[var(--radius-card)] p-1">
      <div className="rounded-[var(--radius-card)] bg-surface-2 px-[14%] py-[11%] transition duration-200 group-hover:bg-[color-mix(in_srgb,var(--surface-2),var(--fg)_6%)]">
        <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" priority={priority} />
      </div>
      <div className="mt-3 flex flex-1 flex-col px-0.5">
        <h3 className="line-clamp-2 font-sans text-[0.9375rem] leading-snug font-semibold tracking-normal group-hover:underline group-hover:underline-offset-2" lang={book.language}>
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{book.author_name}</p>
        <p className="mt-auto flex items-baseline gap-2 pt-1.5">
          <span className="font-semibold tabular-nums">{rupees(Number(book.mrp))}</span>
          <span className="text-xs text-muted">{LANGUAGE_LABEL[book.language]}</span>
        </p>
      </div>
    </Link>
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
