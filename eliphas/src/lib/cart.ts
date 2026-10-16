import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, CART_DAYS, cartCount, parseCart, serializeCart, type CartLine } from "@/lib/cart-codec";
import { canSell } from "@/lib/order-pricing";
import type { Book } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

/**
 * Saves the cart (dropping books that no longer exist) and returns what was saved.
 * Only from server actions or route handlers (cookies can't be set while a page renders).
 */
export async function writeCart(input: CartLine[]) {
  const lines = await pruneCart(input);
  const jar = await cookies();
  if (!lines.length) {
    jar.delete(CART_COOKIE);
    return lines;
  }
  jar.set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_DAYS * 86400,
  });
  return lines;
}

/** Keeps only books that exist and were published at some point (drops tampered or deleted entries). */
export async function pruneCart(lines: CartLine[]): Promise<CartLine[]> {
  if (!lines.length) return lines;
  const { data } = await createAdminClient()
    .from("books")
    .select("id")
    .in(
      "id",
      lines.map((l) => l.bookId),
    )
    .not("published_at", "is", null);
  const known = new Set((data ?? []).map((b) => b.id));
  return lines.filter((l) => known.has(l.bookId));
}

/** Copies for the header badge, counting only real books. No database call when the cart is empty. */
export async function cartBadgeCount(): Promise<number> {
  return cartCount(await pruneCart(await readCart()));
}

export type CartEntry = { book: Book; qty: number; available: boolean };

/**
 * The cart with today's book details, in the order books were added. A book that was unpublished,
 * or can't be sold at today's print rates, is kept but marked unavailable (left out of checkout).
 * Books that no longer exist (or were never published) are dropped.
 */
export async function loadCart(): Promise<CartEntry[]> {
  const lines = await readCart();
  if (!lines.length) return [];
  // Read with full access so a book unpublished since it was added still shows (as unavailable)
  // instead of silently vanishing. Only public details are shown from it.
  const { data: books } = await createAdminClient()
    .from("books")
    .select("*")
    .in(
      "id",
      lines.map((l) => l.bookId),
    )
    .not("published_at", "is", null); // never a draft, even if someone edits the cookie
  const settings = await getPricingSettings();
  const entries: CartEntry[] = [];
  for (const l of lines) {
    const book = books?.find((b) => b.id === l.bookId);
    if (!book) continue;
    entries.push({ book, qty: l.qty, available: await canSell(book, settings) });
  }
  return entries;
}
