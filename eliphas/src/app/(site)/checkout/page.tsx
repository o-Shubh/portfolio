import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { getCurrentProfile } from "@/lib/auth";
import { coverUrl } from "@/lib/books";
import { loadCart } from "@/lib/cart";
import { MAX_QTY } from "@/lib/order-pricing";
import { paymentMode } from "@/lib/payments";
import { addressDefaults } from "./address";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Checkout for everything in the cart that can be ordered now: one order, one parcel, one payment. */
export default async function CartCheckoutPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/checkout");
  if (!profile.full_name) redirect("/onboarding");

  const cart = await loadCart();
  const entries = cart.filter((e) => e.available);
  if (!entries.length) redirect("/cart");
  const skipped = cart.length - entries.length;

  let mode: "razorpay" | "mock" | "off" = "off";
  try {
    mode = paymentMode();
  } catch {}

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/cart" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to cart
      </Link>
      <h1 className="mt-2 text-4xl">Checkout</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <Lock className="h-4 w-4" aria-hidden /> Secure payment by Razorpay: UPI, cards, net banking and wallets.
      </p>
      {skipped > 0 && (
        <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
          {skipped === 1 ? "1 book in your cart can't" : `${skipped} books in your cart can't`} be ordered right now, so{" "}
          {skipped === 1 ? "it's" : "they're"} not included. It stays in your cart.
        </p>
      )}

      {mode === "off" ? (
        <div className="card mt-8">Orders can&apos;t be placed right now. Please try again later.</div>
      ) : (
        <CheckoutForm
          fromCart
          mode={mode}
          maxQty={MAX_QTY}
          items={entries.map(({ book }) => ({
            slug: book.slug,
            title: book.title,
            author: book.author_name,
            mrp: Number(book.mrp),
            cover: <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="xs" />,
          }))}
          initialQty={entries.map((e) => e.qty)}
          defaults={await addressDefaults(profile)}
        />
      )}
    </div>
  );
}
