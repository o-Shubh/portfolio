import test from "node:test";
import assert from "node:assert/strict";
import { bookShareLink, shareCaptions, whatsappLink } from "./share-kit.ts";

test("share link goes through the invite link when there is a code", () => {
  assert.equal(bookShareLink("https://e.in/", "monsoon-letters", null), "https://e.in/books/monsoon-letters");
  assert.equal(bookShareLink("https://e.in", "monsoon-letters", "ABCD2345"), "https://e.in/r/ABCD2345?b=monsoon-letters");
});

test("captions include the title, price, link and any invite offer", () => {
  const c = shareCaptions({ title: "Monsoon Letters", author: "Meera Iyer", mrp: 299, hasSample: true, inviteDiscount: 50 }, "https://e.in/x");
  assert.equal(c.length, 3);
  assert.ok(c[0].text.includes('"Monsoon Letters"') && c[0].text.includes("₹299") && c[0].text.endsWith("https://e.in/x"));
  assert.ok(c[1].text.includes("₹50 off"));
  assert.equal(c[2].label, "Free sample");
  const plain = shareCaptions({ title: "X", author: "Y", mrp: null, hasSample: false, inviteDiscount: 0 }, "L");
  assert.ok(!plain[0].text.includes("₹") && !plain[1].text.includes("off"));
  assert.equal(plain[2].label, "Ask for support");
});

test("WhatsApp link encodes the message", () => {
  assert.equal(whatsappLink("a b&c"), "https://wa.me/?text=a%20b%26c");
});
