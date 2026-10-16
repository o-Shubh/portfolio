import { ShoppingCart, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { coverUrl } from "@/lib/books";
import { loadCart } from "@/lib/cart";
import { MAX_CART_LINES, MAX_QTY } from "@/lib/cart-codec";
import { rupees } from "@/lib/pricing";
import { CartLineControls } from "./CartLineControls";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const entries = await loadCart();
  const available = entries.filter((e) => e.available);
  const booksTotal = available.reduce((a, e) => a + Number(e.book.mrp) * e.qty, 0);
  const copies = available.reduce((a, e) => a + e.qty, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-4xl">Your cart</h1>

      {entries.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-4 py-12 text-center">
          <ShoppingCart className="h-10 w-10 text-muted" aria-hidden />
          <p className="text-lg">Your cart is empty.</p>
          <Link href="/books" className="btn-primary">
            Browse books
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <ul className="card divide-y divide-line py-0">
            {entries.map(({ book, qty, available: ok }) => (
              <li key={book.id} className="flex gap-4 py-5">
                <Link href={`/books/${book.slug}`} className="w-16 shrink-0 sm:w-20">
                  <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" />
                </Link>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-x-4">
                    <div className="min-w-0">
                      <Link href={`/books/${book.slug}`} className="leading-snug font-medium hover:underline">
                        {book.title}
                      </Link>
                      <p className="text-sm text-muted">{book.author_name}</p>
                    </div>
                    <p className="font-semibold tabular-nums">{ok ? rupees(Number(book.mrp) * qty) : "—"}</p>
                  </div>
                  {ok ? (
                    qty > 1 && <p className="text-sm text-muted">{rupees(Number(book.mrp))} each</p>
                  ) : (
                    <p className="text-sm font-medium text-danger">Can&apos;t be ordered right now. It won&apos;t be included at checkout.</p>
                  )}
                  <CartLineControls bookId={book.id} title={book.title} qty={qty} maxQty={MAX_QTY} available={ok} />
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card space-y-4">
              <dl className="space-y-2">
                <div className="flex justify-between text-muted">
                  <dt>
                    Books ({copies} {copies === 1 ? "copy" : "copies"})
                  </dt>
                  <dd className="tabular-nums">{rupees(booksTotal)}</dd>
                </div>
                <div className="flex justify-between text-muted">
                  <dt>Shipping</dt>
                  <dd>At checkout</dd>
                </div>
              </dl>
              <p className="flex items-start gap-2 text-sm text-muted">
                <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                All books are printed fresh and shipped together in one parcel. Shipping depends on your PIN code and the parcel&apos;s weight.
              </p>
              {available.length > 0 ? (
                <Link href="/checkout" className="btn-accent w-full">
                  Checkout
                </Link>
              ) : (
                <p className="text-sm text-muted">Nothing in your cart can be ordered right now.</p>
              )}
              <Link href="/books" className="btn-ghost w-full">
                Keep shopping
              </Link>
              <p className="text-center text-xs text-muted">
                Up to {MAX_CART_LINES} different books and {MAX_QTY} copies of each per order.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
