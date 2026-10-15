import Link from "next/link";
import { coverUrl, LANGUAGE_LABEL, type PublicBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { BookCover } from "./BookCover";

/** A product card: cover, title, author, price. */
export function BookCard({ book, priority }: { book: PublicBook; priority?: boolean }) {
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group flex h-full flex-col rounded-xl bg-surface p-3 shadow-soft ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-gold"
    >
      <div className="rounded-lg bg-surface-2 px-[13%] py-[10%]">
        <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" priority={priority} />
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium" lang={book.language}>
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{book.author_name}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="text-base font-semibold tabular-nums">{rupees(Number(book.mrp))}</span>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem] text-muted">{LANGUAGE_LABEL[book.language]}</span>
        </div>
      </div>
    </Link>
  );
}

export function BookGrid({ books }: { books: PublicBook[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {books.map((b, i) => (
        <li key={b.id}>
          <BookCard book={b} priority={i < 5} />
        </li>
      ))}
    </ul>
  );
}

/** A horizontal row of product cards that scrolls sideways. */
export function BookShelf({ books }: { books: PublicBook[] }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8">
      {books.map((b, i) => (
        <li key={b.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] md:w-[22%] lg:w-[calc((100%-4rem)/5)]">
          <BookCard book={b} priority={i < 5} />
        </li>
      ))}
    </ul>
  );
}
