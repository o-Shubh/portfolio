"use server";

import { addLine, cartCount, setLineQty, type CartChange } from "@/lib/cart-codec";
import { readCart, writeCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";

export type CartActionResult = { ok: true; count: number } | { error: string };

async function save(change: CartChange): Promise<CartActionResult> {
  if ("error" in change) return { error: change.error };
  await writeCart(change.lines);
  return { ok: true, count: cartCount(change.lines) };
}

/** Adds copies of a published book to the cart. Works without logging in. */
export async function addToCart(bookId: string, qty = 1): Promise<CartActionResult> {
  const supabase = await createClient();
  const { data: book } = await supabase.from("books").select("id").eq("id", bookId).eq("status", "published").maybeSingle();
  if (!book) return { error: "This book is no longer available." };
  return save(addLine(await readCart(), book.id, qty));
}

export async function setCartQty(bookId: string, qty: number): Promise<CartActionResult> {
  return save(setLineQty(await readCart(), bookId, qty));
}

export async function removeFromCart(bookId: string): Promise<CartActionResult> {
  return save(setLineQty(await readCart(), bookId, 0));
}
