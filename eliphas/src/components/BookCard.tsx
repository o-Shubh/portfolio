import Link from "next/link";
import { coverUrl, LANGUAGE_LABEL, type PublicBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { BookCover } from "./BookCover";

export function BookCard({ book, priority }: { book: PublicBook; priority?: boolean }) {
  return (
    <Link href={`/books/${book.slug}`} className="group block rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-fg">
      <div className="rounded-lg bg-surface-2 px-[14%] pt-[14%] pb-[12%] transition duration-300 group-hover:bg-line">
        <div className="transition duration-300 group-hover:-translate-y-1">
          <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" priority={priority} />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="line-clamp-2 font-sans text-[0.9375rem] leading-snug font-medium tracking-normal" lang={book.language}>
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{book.author_name}</p>
        <p className="mt-1.5 flex items-center gap-2 text-sm">
          <span className="font-medium tabular-nums">{rupees(Number(book.mrp))}</span>
          <span className="text-muted" aria-hidden>
            ·
          </span>
          <span className="text-muted">{LANGUAGE_LABEL[book.language]}</span>
        </p>
      </div>
    </Link>
  );
}

export function BookGrid({ books }: { books: PublicBook[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
      {books.map((b, i) => (
        <li key={b.id}>
          <BookCard book={b} priority={i < 5} />
        </li>
      ))}
    </ul>
  );
}

/** A horizontal shelf that scrolls sideways on every screen size. */
export function BookShelf({ books }: { books: PublicBook[] }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8">
      {books.map((b, i) => (
        <li key={b.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] md:w-[22%] lg:w-[calc((100%-6rem)/5)]">
          <BookCard book={b} priority={i < 5} />
        </li>
      ))}
    </ul>
  );
}
