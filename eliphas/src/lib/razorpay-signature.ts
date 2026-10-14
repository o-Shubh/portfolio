// Razorpay signature checks. Pure functions (node:crypto only) so they can be unit tested.
import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout handler: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret) */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw request body, webhook_secret) */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
