// Pure payment decisions (no network, no secrets), so they can be unit-tested.

/**
 * Test payments only run on a computer, never on a hosted site: the site address must be localhost and it
 * must not be a Vercel production deployment. Any other host (Vercel, Render, a VPS…) refuses them.
 */
export function mockAllowed(env: { VERCEL_ENV?: string; NEXT_PUBLIC_SITE_URL?: string }): boolean {
  if (env.VERCEL_ENV === "production") return false;
  try {
    const host = new URL(env.NEXT_PUBLIC_SITE_URL ?? "").hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export type CaptureCheck = { state: "captured"; fee: number | null } | { state: "pending" } | { state: "invalid"; reason: string };

/**
 * Given Razorpay's view of a payment (or null if it couldn't be fetched), decide whether money was captured for this
 * order and amount. Only "captured" may send a book to print or activate Pro; "pending" waits for the webhook.
 */
export function captureDecision(
  p: { status: string; order_id: string; amount: number; fee: number | null } | null,
  razorpayOrderId: string,
  amountPaise: number,
): CaptureCheck {
  if (!p) return { state: "pending" };
  if (p.order_id !== razorpayOrderId || p.amount !== amountPaise) return { state: "invalid", reason: "Payment doesn't match this order." };
  if (p.status === "captured") return { state: "captured", fee: p.fee };
  if (p.status === "failed") return { state: "invalid", reason: "The payment failed. No money was taken." };
  return { state: "pending" };
}
