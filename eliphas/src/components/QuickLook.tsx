"use client";

import { BookOpen, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { AddToCartButton } from "./AddToCartButton";

/**
 * "Quick look" for a book tile: a sheet (bottom sheet on phones, dialog on larger screens) with the real
 * cover, price and actions. Uses the native <dialog>, so focus stays inside and Esc closes it.
 */
export function QuickLook({
  book,
  cover,
}: {
  book: { id: string; slug: string; title: string; author: string; price: string; language: string; description: string | null; meta: string; sample: boolean };
  cover: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="relative z-10 inline-flex min-h-11 items-center rounded-full bg-surface/90 px-3 text-xs font-medium text-fg shadow-soft ring-1 ring-line backdrop-blur transition hover:bg-surface pointer-fine:min-h-8"
      >
        Quick look<span className="sr-only">: {book.title}</span>
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`ql-${book.id}`}
        className="quick-look m-0 mt-auto w-full max-w-none rounded-t-[18px] bg-surface p-0 text-fg shadow-sheet sm:m-auto sm:max-w-xl sm:rounded-[18px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close(); // click on the backdrop
        }}
      >
        <div className="safe-bottom p-5 sm:p-6">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
          <div className="flex gap-5">
            <div className="w-28 shrink-0 sm:w-36">{cover}</div>
            <div className="min-w-0 flex-1">
              <h2 id={`ql-${book.id}`} className="font-serif text-xl leading-snug font-semibold tracking-normal" lang={book.language}>
                {book.title}
              </h2>
              <p className="mt-0.5 text-sm text-muted">{book.author}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{book.price}</p>
              <p className="text-xs text-muted">Inclusive of all taxes · shipping shown at checkout</p>
              <p className="mt-1 text-xs text-muted">{book.meta}</p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} className="-mt-1 -mr-1 grid h-11 w-11 shrink-0 place-items-center self-start rounded-full text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {book.description && (
            <p className="mt-4 line-clamp-4 text-[0.9375rem] leading-relaxed text-fg/90" lang={book.language}>
              {book.description}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href={`/checkout/${book.slug}`} className="btn-accent min-h-12">
              Buy now
            </Link>
            <AddToCartButton bookId={book.id} className="min-h-12" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {book.sample && (
              <Link href={`/books/${book.slug}/sample`} className="btn-quiet min-h-11 text-sm">
                <BookOpen className="h-4 w-4" aria-hidden /> Read a sample
              </Link>
            )}
            <Link href={`/books/${book.slug}`} className="btn-quiet min-h-11 text-sm">
              Book details
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
