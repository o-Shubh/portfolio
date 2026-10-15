/**
 * The cart is kept in a first-party cookie as "bookId:qty|bookId:qty", so it works before login and
 * needs no database table. Pure helpers here (no server imports) so they can be unit tested.
 */
export const CART_COOKIE = "eip_cart";
export const CART_DAYS = 60;
/** Most copies of one book in an order. */
export const MAX_QTY = 10;
/** Most different books in one order (one parcel from one printer). */
export const MAX_CART_LINES = 10;

export type CartLine = { bookId: string; qty: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads the cookie value. Anything malformed is dropped; duplicates are merged; limits are applied. */
export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  const lines: CartLine[] = [];
  for (const part of raw.split("|")) {
    const [bookId, q] = part.split(":");
    const qty = Number(q);
    if (!bookId || !UUID.test(bookId) || !Number.isInteger(qty) || qty < 1) continue;
    const id = bookId.toLowerCase();
    const existing = lines.find((l) => l.bookId === id);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else if (lines.length < MAX_CART_LINES) lines.push({ bookId: id, qty: Math.min(MAX_QTY, qty) });
  }
  return lines;
}

export function serializeCart(lines: CartLine[]): string {
  return lines.map((l) => `${l.bookId}:${l.qty}`).join("|");
}

export type CartChange = { lines: CartLine[] } | { error: string };

/** Adds copies of a book (new books go to the end). */
export function addLine(lines: CartLine[], bookId: string, qty = 1): CartChange {
  if (!UUID.test(bookId) || !Number.isInteger(qty) || qty < 1) return { error: "Couldn't add this book." };
  const id = bookId.toLowerCase();
  const existing = lines.find((l) => l.bookId === id);
  if (existing) {
    if (existing.qty >= MAX_QTY) return { error: `You can order up to ${MAX_QTY} copies of a book.` };
    return { lines: lines.map((l) => (l.bookId === id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)) };
  }
  if (lines.length >= MAX_CART_LINES) return { error: `Your cart can hold up to ${MAX_CART_LINES} different books.` };
  return { lines: [...lines, { bookId: id, qty: Math.min(MAX_QTY, qty) }] };
}

/** Sets the copies of a book already in the cart; 0 removes it. */
export function setLineQty(lines: CartLine[], bookId: string, qty: number): CartChange {
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) return { error: `Choose between 1 and ${MAX_QTY} copies.` };
  const id = bookId.toLowerCase();
  if (qty === 0) return { lines: lines.filter((l) => l.bookId !== id) };
  if (!lines.some((l) => l.bookId === id)) return { error: "This book isn't in your cart." };
  return { lines: lines.map((l) => (l.bookId === id ? { ...l, qty } : l)) };
}

/** Copies in the cart, for the header badge. */
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);

/** What the checkout form sends: one entry per book, validated on the server. */
export type CheckoutItem = { slug: string; qty: number };

export function parseCheckoutItems(raw: unknown): CheckoutItem[] | { error: string } {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return { error: "Your order is empty." };
    }
  }
  if (!Array.isArray(data) || data.length === 0) return { error: "Your order is empty." };
  if (data.length > MAX_CART_LINES) return { error: `An order can have up to ${MAX_CART_LINES} different books.` };
  const items: CheckoutItem[] = [];
  for (const d of data) {
    const slug = typeof d?.slug === "string" ? d.slug : "";
    const qty = Number(d?.qty);
    if (!/^[a-z0-9-]{1,120}$/.test(slug)) return { error: "Your order has a book we couldn't find." };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Quantity must be between 1 and ${MAX_QTY}.` };
    if (items.some((i) => i.slug === slug)) return { error: "Your order lists the same book twice." };
    items.push({ slug, qty });
  }
  return items;
}
