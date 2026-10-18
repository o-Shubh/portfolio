import { ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { BINDING_LABEL, coverUrl, listPublishedBooks } from "@/lib/books";
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

  const inCart = new Set(entries.map((e) => e.book.id));
  const suggestions = entries.length ? (await listPublishedBooks({ page: 1 })).books.filter((b) => !inCart.has(b.id)).slice(0, 3) : [];

  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/books" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          ← Bookstore
        </Link>
      </nav>
      <h1 className="display mt-2 text-[1.875rem] md:text-4xl">Your cart</h1>
      {entries.length > 0 && <p className="mt-1 text-muted">Every copy is printed fresh for you and shipped together in one parcel.</p>}

      {entries.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-[var(--radius-card)] bg-surface px-6 py-14 text-center ring-1 ring-line">
          <ShoppingCart className="h-10 w-10 text-muted" aria-hidden />
          <p className="display text-xl">Your cart is empty.</p>
          <p className="text-sm text-muted">Find something to read in the bookstore.</p>
          <Link href="/books" className="btn-primary">
            Browse books
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface px-4 ring-1 ring-line sm:px-6">
            {entries.map(({ book, qty, available: ok }) => (
              <li key={book.id} className="flex gap-4 py-5 sm:gap-5" data-testid="cart-line">
                <Link href={`/books/${book.slug}`} tabIndex={-1} aria-hidden className="w-20 shrink-0 self-start rounded-lg bg-ivory p-2 sm:w-24">
                  <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" />
                </Link>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-x-4">
                    <div className="min-w-0">
                      <Link href={`/books/${book.slug}`} className="font-serif text-lg leading-snug font-semibold hover:underline" lang={book.language}>
                        {book.title}
                      </Link>
                      <p className="text-sm text-muted">{book.author_name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {BINDING_LABEL[book.binding] ?? book.binding}
                        {book.eeid && (
                          <>
                            {" · "}
                            <span className="mono">{book.eeid}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="mono text-lg font-medium">{ok ? rupees(Number(book.mrp) * qty) : "—"}</p>
                  </div>
                  {ok ? (
                    qty > 1 && <p className="mono text-xs text-muted">{rupees(Number(book.mrp))} each</p>
                  ) : (
                    <p className="notice-danger py-2.5 text-sm font-medium">Can&apos;t be ordered right now. It won&apos;t be included at checkout.</p>
                  )}
                  <CartLineControls bookId={book.id} title={book.title} qty={qty} maxQty={MAX_QTY} available={ok} />
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line">
              <h2 className="text-lg">Order summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">
                    Books ({copies} {copies === 1 ? "copy" : "copies"})
                  </dt>
                  <dd className="mono">{rupees(booksTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd>Calculated at checkout</dd>
                </div>
              </dl>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <p className="font-medium">Books total</p>
                <p className="mono text-2xl font-medium">{rupees(booksTotal)}</p>
              </div>
              <p className="-mt-2 text-xs text-muted">Book prices include all taxes. Shipping is added at checkout.</p>
              {available.length > 0 ? (
                <Link href="/checkout" className="btn-accent min-h-12 w-full text-base">
                  Checkout
                </Link>
              ) : (
                <p className="notice-warn text-sm">Nothing in your cart can be ordered right now.</p>
              )}
              <Link href="/books" className="btn-ghost w-full">
                Keep shopping
              </Link>
              <ul className="space-y-2 border-t border-line pt-4 text-xs text-muted">
                <li className="flex items-start gap-2">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Shipping depends on your PIN code and the parcel&apos;s weight.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Secure payment by Razorpay.
                </li>
              </ul>
              <p className="text-center text-xs text-muted">
                Up to {MAX_CART_LINES} different books and {MAX_QTY} copies of each per order.
              </p>
            </div>
          </aside>
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-lg sm:text-xl">You might also like</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {suggestions.map((b) => (
              <li key={b.id} className="relative flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-3 ring-1 ring-line">
                <div className="w-14 shrink-0">
                  <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size="xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/books/${b.slug}`} className="line-clamp-1 font-serif font-semibold hover:underline" lang={b.language}>
                    {b.title}
                  </Link>
                  <p className="truncate text-xs text-muted">{b.author_name}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="mono text-sm">{rupees(Number(b.mrp))}</span>
                    <AddToCartButton bookId={b.id} compact title={b.title} className="min-h-11 px-2.5 text-xs pointer-fine:min-h-8" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
