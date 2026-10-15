"use client";

import { Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { confirmPayment, quoteCheckout, startCheckout, type CheckoutResult, type ShippingQuoteResult } from "@/app/actions/checkout";
import { formatPaise } from "@/lib/commission";
import { INDIAN_STATES } from "@/lib/india";
import { rupees } from "@/lib/pricing";

type Started = Extract<CheckoutResult, { orderId: string }>;

// Razorpay's checkout script adds this global
type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type CheckoutBook = { slug: string; title: string; author: string; mrp: number; cover: React.ReactNode };

/**
 * Delivery address, live shipping quote and payment for one or more books (one parcel).
 * "Buy now" passes one book with a copies stepper; the cart passes its books with quantities set on the cart page.
 */
export function CheckoutForm({
  items,
  initialQty,
  fromCart = false,
  defaults,
  mode,
  maxQty,
}: {
  items: CheckoutBook[];
  initialQty?: number[];
  fromCart?: boolean;
  defaults: Record<string, string>;
  mode: "razorpay" | "mock";
  maxQty: number;
}) {
  const router = useRouter();
  const [qtys, setQtys] = useState<number[]>(() => items.map((_, i) => initialQty?.[i] ?? 1));
  const editable = !fromCart && items.length === 1;
  const qty = qtys[0];
  const setQty = (f: (q: number) => number) => setQtys((qs) => [f(qs[0]), ...qs.slice(1)]);
  const lines = items.map((it, i) => ({ slug: it.slug, qty: qtys[i] }));
  const booksTotal = items.reduce((a, it, i) => a + it.mrp * qtys[i], 0);
  const copies = qtys.reduce((a, q) => a + q, 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockOrder, setMockOrder] = useState<Started | null>(null);

  const [pincode, setPincode] = useState(defaults.ship_pincode ?? "");
  const [result, setResult] = useState<{ key: string; quote: ShippingQuoteResult } | null>(null);
  const [quoting, startQuote] = useTransition();
  const validPin = /^[1-9]\d{5}$/.test(pincode);
  const key = `${pincode}:${qtys.join(",")}`;

  // Shipping depends on the PIN code and parcel weight, so ask the server for a quote
  useEffect(() => {
    if (!validPin) return;
    const forKey = key;
    const order = items.map((it, i) => ({ slug: it.slug, qty: qtys[i] }));
    startQuote(async () => setResult({ key: forKey, quote: await quoteCheckout(order, pincode) }));
    // key covers the PIN code and every quantity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validPin, key]);
  // Only show a quote that matches what's on screen now
  const quote = validPin && result?.key === key ? result.quote : null;
  const priced = quote && !("error" in quote) ? quote : null;

  async function finish(order: Started, paymentId: string, signature: string) {
    const res = await confirmPayment({
      orderId: order.orderId,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      fromCart: order.fromCart,
    });
    if ("error" in res) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push(`/account/orders/${order.orderId}?paid=1`);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await startCheckout(new FormData(e.currentTarget));
    if ("error" in result) {
      setBusy(false);
      setError(result.error);
      return;
    }

    if (result.mode === "mock") {
      setMockOrder(result);
      return;
    }

    if (!(await loadRazorpay()) || !window.Razorpay) {
      setBusy(false);
      setError("Couldn't load the payment window. Check your internet connection and try again.");
      return;
    }
    const rzp = new window.Razorpay({
      key: result.keyId,
      amount: result.amountPaise,
      currency: "INR",
      order_id: result.razorpayOrderId,
      name: "Eliphas Indicus",
      description: `Order ${result.orderNumber}`,
      prefill: { name: result.name, contact: `+91${result.phone}` },
      theme: { color: "#13223C" },
      handler: (r: RazorpayResponse) => finish(result, r.razorpay_payment_id, r.razorpay_signature),
      modal: {
        ondismiss: () => {
          setBusy(false);
          setError("Payment was not completed. You can try again.");
        },
      },
    });
    rzp.on("payment.failed", () => setError("The payment failed. No money was taken. Please try again."));
    rzp.open();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <input type="hidden" name="items" value={JSON.stringify(lines)} />
        <input type="hidden" name="from_cart" value={fromCart ? "1" : "0"} />

        <section className="card space-y-4">
          <h2 className="text-2xl">Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ship_name" label="Full name" autoComplete="name" defaultValue={defaults.ship_name} />
            <Field
              id="ship_phone"
              label="Mobile number (for the courier)"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              defaultValue={defaults.ship_phone}
            />
          </div>
          <Field id="ship_line1" label="House, building, street" autoComplete="address-line1" defaultValue={defaults.ship_line1} />
          <Field id="ship_line2" label="Area, landmark (optional)" autoComplete="address-line2" defaultValue={defaults.ship_line2} required={false} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="ship_city" label="City" autoComplete="address-level2" defaultValue={defaults.ship_city} />
            <div>
              <label htmlFor="ship_state" className="label">
                State
              </label>
              <select id="ship_state" name="ship_state" className="field" defaultValue={defaults.ship_state} required autoComplete="address-level1">
                <option value="" disabled>
                  Choose
                </option>
                {INDIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <Field
              id="ship_pincode"
              label="PIN code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-5">
            {fromCart && (
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg">
                  {items.length} {items.length === 1 ? "book" : "books"} · {copies} {copies === 1 ? "copy" : "copies"}
                </h2>
                <Link href="/cart" className="text-sm font-semibold underline underline-offset-2">
                  Edit cart
                </Link>
              </div>
            )}
            <ul className="space-y-4">
              {items.map((it, i) => (
                <li key={it.slug} className="flex gap-4">
                  <div className={`${items.length > 1 ? "w-14" : "w-20"} shrink-0`}>{it.cover}</div>
                  <div className="min-w-0">
                    <p className="leading-snug font-medium">{it.title}</p>
                    <p className="text-sm text-muted">{it.author}</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {rupees(it.mrp)}
                      {!editable && <span className="font-normal text-muted"> × {qtys[i]}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {editable && (
            <div className="flex items-center justify-between">
              <span className="font-semibold">Copies</span>
              <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="One less copy">
                  <Minus className="h-4 w-4" />
                </button>
                <output className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
                  {qty}
                </output>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="One more copy">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            )}

            <dl className="space-y-2 border-t border-line pt-4">
              <div className="flex justify-between text-muted">
                <dt>Books</dt>
                <dd className="tabular-nums">{rupees(booksTotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Shipping</dt>
                <dd className="tabular-nums" aria-live="polite">
                  {quoting ? "Checking…" : priced ? (priced.shippingPaise === 0 ? "Free" : formatPaise(priced.shippingPaise)) : "Enter PIN code"}
                </dd>
              </div>
              {priced && priced.discountPaise > 0 && (
                <p className="text-xs text-success">
                  {priced.promotion}: {formatPaise(priced.discountPaise)} off shipping (was {formatPaise(priced.basePaise)})
                </p>
              )}
              {quote && "error" in quote && <p className="text-xs text-danger">{quote.error}</p>}
              <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{priced ? formatPaise(priced.totalPaise) : "—"}</dd>
              </div>
            </dl>

            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <input type="hidden" name="expected_total_paise" value={priced?.totalPaise ?? ""} />
            <button type="submit" className="btn-accent w-full" disabled={busy || !priced || quoting}>
              {busy ? "Opening payment…" : priced ? `Pay ${formatPaise(priced.totalPaise)}` : "Enter delivery PIN code"}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {mode === "mock"
                ? "Test mode: no real money is taken."
                : items.length > 1
                  ? "Printed fresh and shipped together in one parcel in 5–9 working days."
                  : "Printed fresh and shipped in 5–9 working days."}
            </p>
            <p className="text-center text-xs text-muted">
              By paying you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/refunds" className="underline underline-offset-2">
                refund policy
              </Link>
              . Free cancellation until printing starts.
            </p>
          </div>
        </aside>
      </form>

      {mockOrder && (
        <div role="dialog" aria-modal="true" aria-labelledby="mock-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm space-y-4 text-center">
            <span className="eyebrow">Test payment</span>
            <h2 id="mock-title" className="text-2xl">
              Pay {rupees(mockOrder.amountPaise / 100)}
            </h2>
            <p className="text-sm text-muted">
              Razorpay keys aren&apos;t set yet, so this pretend payment stands in for it. Order {mockOrder.orderNumber}.
            </p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => finish(mockOrder, `mock_pay_${Date.now()}`, "mock")}
            >
              Pay successfully
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => {
                setMockOrder(null);
                setBusy(false);
                setError("Payment was not completed. You can try again.");
              }}
            >
              Cancel payment
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  id,
  label,
  required = true,
  ...rest
}: { id: string; label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} name={id} className="field" required={required} {...rest} />
    </div>
  );
}
