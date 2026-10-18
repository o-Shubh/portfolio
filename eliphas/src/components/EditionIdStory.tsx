import { ArrowRight, ScanLine } from "lucide-react";
import { BookCover } from "./BookCover";

/**
 * How an Eliphas Edition ID works, drawn as three steps: the printed book with its label, the QR code,
 * and the edition page it opens. Uses a real published edition when one has an ID; otherwise the steps
 * are clearly marked as an example.
 */
export function EditionIdStory({
  book,
  qr,
}: {
  book: { title: string; author_name: string; slug: string; cover: string | null; eeid: string | null; format: string; language: string } | null;
  qr: string | null;
}) {
  const real = Boolean(book?.eeid && qr);
  const id = real ? book!.eeid! : "EEID-2026-000123";
  return (
    <figure className="relative">
      <ol className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-3" aria-label="From printed book to edition page">
        <li className="flex flex-col items-center text-center">
          <div className="relative w-28 sm:w-32">
            {book ? (
              <BookCover title={book.title} author={book.author_name} slug={book.slug} src={book.cover} size="sm" />
            ) : (
              <div className="aspect-[2/3] w-full rounded-l-[3px] rounded-r-lg bg-primary shadow-spine" />
            )}
            {/* The edition label with its QR, as it sits on the back of the book */}
            <span className="absolute -right-3 -bottom-3 grid h-12 w-12 place-items-center rounded-md bg-white p-1 shadow-lift ring-1 ring-black/10" aria-hidden>
              {real ? <span className="block h-full w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr! }} /> : <ScanLine className="h-6 w-6 text-[#17214A]" />}
            </span>
          </div>
          <p className="mt-5 text-sm font-semibold">The printed book</p>
          <p className="text-xs text-muted">Its label carries a QR code</p>
        </li>
        <li aria-hidden className="hidden text-muted sm:block">
          <ArrowRight className="h-5 w-5" />
        </li>
        <li className="flex flex-col items-center text-center">
          <div className="grid h-40 w-40 place-items-center rounded-[18px] bg-white p-4 shadow-sheet ring-1 ring-black/5">
            {real ? (
              <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full" role="img" aria-label={`QR code for edition ${id}`} dangerouslySetInnerHTML={{ __html: qr! }} />
            ) : (
              <ScanLine className="h-16 w-16 text-[#17214A]" aria-hidden />
            )}
          </div>
          <p className="mt-5 text-sm font-semibold">Scan with any phone camera</p>
          <p className="text-xs text-muted">No app needed</p>
        </li>
        <li aria-hidden className="hidden text-muted sm:block">
          <ArrowRight className="h-5 w-5" />
        </li>
        <li className="flex flex-col items-center text-center">
          <div className="w-full max-w-[15rem] rounded-[18px] bg-surface p-4 text-left shadow-sheet ring-1 ring-line">
            <p className="text-[0.65rem] font-semibold tracking-[0.06em] text-muted uppercase">Eliphas Edition ID</p>
            <p className="id-mono mt-0.5 text-sm font-medium">{id}</p>
            <p className="mt-3 line-clamp-2 font-serif font-semibold" lang={book?.language}>
              {book?.title ?? "Your book"}
            </p>
            <p className="text-xs text-muted">{book ? `${book.author_name} · ${book.format}` : "Author · Paperback"}</p>
            <div className="mt-3 h-8 rounded-[10px] bg-buy/90" />
          </div>
          <p className="mt-5 text-sm font-semibold">The edition&apos;s own page</p>
          <p className="text-xs text-muted">Format, ISBN and where to buy</p>
        </li>
      </ol>
      {!real && <figcaption className="mt-4 text-center text-xs text-muted">Example. Each approved edition gets its own ID and QR code.</figcaption>}
    </figure>
  );
}
