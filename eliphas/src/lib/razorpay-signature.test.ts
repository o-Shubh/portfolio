// Run with: npm test
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyPaymentSignature, verifyWebhookSignature } from "./razorpay-signature.ts";

const secret = "test_secret";

test("accepts a correct payment signature and rejects a tampered one", () => {
  const sig = createHmac("sha256", secret).update("order_ABC|pay_XYZ").digest("hex");
  assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", sig, secret), true);
  assert.equal(verifyPaymentSignature("order_ABC", "pay_OTHER", sig, secret), false);
  assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", sig, "wrong_secret"), false);
  assert.equal(verifyPaymentSignature("order_ABC", "pay_XYZ", "short", secret), false);
});

test("webhook signature covers the exact raw body", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, sig, secret), true);
  assert.equal(verifyWebhookSignature(body + " ", sig, secret), false);
});
