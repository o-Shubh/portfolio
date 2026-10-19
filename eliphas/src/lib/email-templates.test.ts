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
