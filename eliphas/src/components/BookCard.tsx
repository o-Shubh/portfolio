import Link from "next/link";
import { coverUrl, LANGUAGE_LABEL, type PublicBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { BookCover } from "./BookCover";

export function BookCard({ book, priority }: { book: PublicBook; priority?: boolean }) {
  return (
    <Link href={`/books/${book.slug}`} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-marigold">
      <div className="transition-transform group-hover:-translate-y-1">
        <BookCover
          title={book.title}
          author={book.author_name}
          slug={book.slug}
          src={coverUrl(book.cover_path)}
          size="sm"
          priority={priority}
        />
      </div>
      <h3 className="mt-3 line-clamp-2 font-heading text-base font-semibold group-hover:underline">{book.title}</h3>
      <p className="line-clamp-1 text-sm text-muted">{book.author_name}</p>
      <p className="mt-1 flex items-center gap-2">
        <span className="font-semibold">{rupees(Number(book.mrp))}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{LANGUAGE_LABEL[book.language]}</span>
      </p>
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
