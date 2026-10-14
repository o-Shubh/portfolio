import Link from "next/link";
import { coverUrl, LANGUAGE_LABEL, type PublicBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { BookCover } from "./BookCover";

export function BookCard({ book, priority }: { book: PublicBook; priority?: boolean }) {
  return (
    <Link href={`/books/${book.slug}`} className="group block rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-marigold">
      <div className="rounded-2xl bg-surface-2/70 p-4 transition duration-300 group-hover:bg-surface-2 sm:p-5">
        <div className="transition duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-1deg]">
          <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" priority={priority} />
        </div>
      </div>
      <div className="mt-3 px-1">
        <h3 className="line-clamp-2 font-heading text-[1.05rem] font-semibold">{book.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{book.author_name}</p>
        <p className="mt-2 flex items-center justify-between gap-2">
          <span className="font-semibold tabular-nums">{rupees(Number(book.mrp))}</span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
            {LANGUAGE_LABEL[book.language]}
          </span>
        </p>
      </div>
    </Link>
  );
}

export function BookGrid({ books }: { books: PublicBook[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((b, i) => (
        <li key={b.id}>
          <BookCard book={b} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
