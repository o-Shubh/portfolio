import test from "node:test";
import assert from "node:assert/strict";
import { parseEmail } from "./email-format.ts";
import { contactEmail, orderEmail } from "./email-templates.ts";

const base = {
  siteUrl: "https://eliphas.in/",
  businessName: "Eliphas Indicus Publications",
  orderId: "abc",
  orderNumber: "EIP-261019-ABC123",
  name: "Asha",
  items: [{ title: "Monsoon Letters", quantity: 1 }],
  totalLabel: "₹359",
};

test("email addresses are trimmed, lower-cased and checked", () => {
  assert.equal(parseEmail("  Asha@Example.IN "), "asha@example.in");
  assert.equal(parseEmail(""), null);
  assert.equal(parseEmail("not-an-email"), "invalid");
  assert.equal(parseEmail("a@b"), "invalid");
});

test("shipped email includes the tracking link and the order link", () => {
  const e = orderEmail("order_shipped", {
    ...base,
    courier: "Delhivery",
    trackingNumber: "DLV123",
    trackingUrl: "https://www.delhivery.com/track/package/DLV123",
  });
  assert.equal(e.subject, "Order EIP-261019-ABC123 has shipped");
  assert.ok(e.html.includes("https://www.delhivery.com/track/package/DLV123"));
  assert.ok(e.html.includes("https://eliphas.in/account/orders/abc"));
  assert.ok(e.text.includes("Tracking number: DLV123"));
});

test("user content is escaped in HTML", () => {
  const e = orderEmail("order_confirmed", { ...base, name: "<b>x</b>", items: [{ title: "A & B <script>", quantity: 2 }] });
  assert.ok(!e.html.includes("<script>"));
  assert.ok(e.html.includes("A &amp; B &lt;script&gt;"));
  const c = contactEmail({
    siteUrl: "https://eliphas.in",
    businessName: "E",
    name: "R",
    email: "r@e.in",
    topic: "Orders",
    message: "<img src=x onerror=alert(1)>",
  });
  assert.ok(!c.html.includes("<img"));
});

test("cancel and refund emails explain the refund", () => {
  assert.ok(orderEmail("order_cancelled", { ...base, cancelReason: "Out of stock" }).text.includes("Reason: Out of stock"));
  assert.ok(orderEmail("refund_processed", { ...base, refundLabel: "₹359" }).text.includes("₹359 has been refunded"));
});

test("weekly email: nothing to send when there's no news", async () => {
  const { digestEmail } = await import("./email-templates.ts");
  const empty = { books: [], savedBooks: [], articles: [], posts: [] };
  assert.equal(digestEmail({ siteUrl: "https://e.in", businessName: "Eliphas", name: "Asha", unsubscribeUrl: "https://e.in/u?t=1", sections: empty }), null);
  const m = digestEmail({
    siteUrl: "https://e.in",
    businessName: "Eliphas",
    name: "Asha <b>",
    unsubscribeUrl: "https://e.in/unsubscribe?t=abc",
    sections: { ...empty, savedBooks: [{ title: "Monsoon <Letters>", note: "Now ₹249", url: "https://e.in/books/m" }], books: [{ title: "New", by: "Meera", url: "https://e.in/books/n" }] },
  });
  assert.ok(m);
  assert.equal(m.subject, "2 new things for you this week");
  assert.ok(m.html.includes("Monsoon &lt;Letters&gt;") && !m.html.includes("<b>"), "escaped");
  assert.ok(m.html.includes("https://e.in/unsubscribe?t=abc") && m.text.includes("Unsubscribe: https://e.in/unsubscribe?t=abc"));
  assert.ok(m.text.indexOf("BOOKS YOU SAVED") < m.text.indexOf("NEW BOOKS"), "saved books first");
});

test("confirmation links the invoice, other emails don't need it", () => {
  const e = orderEmail("order_confirmed", { ...base, invoice: { id: "inv-1", label: "Bill of supply" } });
  assert.ok(e.html.includes("/invoices/inv-1") && e.html.includes("View your bill of supply"));
  assert.ok(e.text.includes("Bill of supply: https://eliphas.in/invoices/inv-1"));
  assert.ok(!orderEmail("order_shipped", base).html.includes("/invoices/"));
});
