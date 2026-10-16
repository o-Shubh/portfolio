import assert from "node:assert/strict";
import { test } from "node:test";
import { addLine, cartCount, MAX_CART_LINES, MAX_QTY, parseCart, parseCheckoutItems, serializeCart, setLineQty, type CartLine } from "./cart-codec.ts";

const A = "00000000-0000-4000-a000-0000000000aa";
const B = "00000000-0000-4000-a000-0000000000bb";
const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`;
const ok = (r: ReturnType<typeof addLine>) => {
  assert.ok("lines" in r, JSON.stringify(r));
  return r.lines;
};

test("cart cookie round-trips", () => {
  const lines: CartLine[] = [{ bookId: A, qty: 2 }, { bookId: B, qty: 1 }];
  assert.deepEqual(parseCart(serializeCart(lines)), lines);
  assert.equal(cartCount(lines), 3);
});

test("malformed cookie parts are dropped, duplicates merged, limits applied", () => {
  assert.deepEqual(parseCart(""), []);
  assert.deepEqual(parseCart(`junk|${A}:x|${A}:0|not-a-uuid:2|${A}:3|${A.toUpperCase()}:2|${B}:99`), [
    { bookId: A, qty: 5 },
    { bookId: B, qty: MAX_QTY },
  ]);
  const many = Array.from({ length: MAX_CART_LINES + 3 }, (_, i) => `${id(i + 1)}:1`).join("|");
  assert.equal(parseCart(many).length, MAX_CART_LINES);
});

test("adding increases copies up to the limit", () => {
  let lines = ok(addLine([], A));
  lines = ok(addLine(lines, A, 2));
  assert.deepEqual(lines, [{ bookId: A, qty: 3 }]);
  lines = ok(addLine(lines, A, 50));
  assert.equal(lines[0].qty, MAX_QTY);
  assert.ok("error" in addLine(lines, A));
  assert.ok("error" in addLine(lines, "nope"));
});

test("cart holds a limited number of different books", () => {
  let lines: CartLine[] = [];
  for (let i = 1; i <= MAX_CART_LINES; i++) lines = ok(addLine(lines, id(i)));
  assert.ok("error" in addLine(lines, id(99)));
  // more copies of a book already there is still fine
  assert.ok("lines" in addLine(lines, id(1)));
});

test("set quantity, and 0 removes", () => {
  const lines = ok(addLine(ok(addLine([], A)), B));
  assert.deepEqual(ok(setLineQty(lines, B, 4)), [{ bookId: A, qty: 1 }, { bookId: B, qty: 4 }]);
  assert.deepEqual(ok(setLineQty(lines, A, 0)), [{ bookId: B, qty: 1 }]);
  assert.ok("error" in setLineQty(lines, A, MAX_QTY + 1));
  assert.ok("error" in setLineQty(lines, A, 1.5));
  assert.ok("error" in setLineQty([], A, 2));
});

test("checkout items are validated", () => {
  assert.deepEqual(parseCheckoutItems(JSON.stringify([{ slug: "monsoon-letters", qty: 2 }, { slug: "the-deodar-trail", qty: 1 }])), [
    { slug: "monsoon-letters", qty: 2 },
    { slug: "the-deodar-trail", qty: 1 },
  ]);
  for (const bad of ["", "{", "[]", JSON.stringify([{ slug: "a", qty: 0 }]), JSON.stringify([{ slug: "a", qty: 11 }]), JSON.stringify([{ slug: "A B", qty: 1 }]), JSON.stringify([{ slug: "a", qty: 1 }, { slug: "a", qty: 1 }])]) {
    assert.ok("error" in (parseCheckoutItems(bad) as object), bad);
  }
  const tooMany = Array.from({ length: MAX_CART_LINES + 1 }, (_, i) => ({ slug: `b${i}`, qty: 1 }));
  assert.ok("error" in (parseCheckoutItems(JSON.stringify(tooMany)) as object));
});
