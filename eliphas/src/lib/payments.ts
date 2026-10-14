import "server-only";

/**
 * How payments are taken:
 *  - "razorpay": real Razorpay Checkout (test or live keys from the environment)
 *  - "mock":     a built-in pretend payment, for local development without keys.
 *                Never allowed on the live (production) website.
 */
export type PaymentMode = "razorpay" | "mock";

export function paymentMode(): PaymentMode {
  const hasKeys = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const wantsMock = process.env.PAYMENTS_MODE === "mock" || !hasKeys;
  if (wantsMock) {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("Razorpay keys are missing on the live site. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel.");
    }
    return "mock";
  }
  return "razorpay";
}

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => {
  const s = process.env.RAZORPAY_KEY_SECRET;
  if (!s) throw new Error("Missing RAZORPAY_KEY_SECRET.");
  return s;
};
export const razorpaySecret = keySecret;

/** Creates a Razorpay order (amount in rupees). Returns Razorpay's order id. */
export async function createRazorpayOrder(input: { amountRupees: number; receipt: string; notes: Record<string, string> }) {
  const auth = Buffer.from(`${razorpayKeyId()}:${keySecret()}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(input.amountRupees * 100), // paise
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}
