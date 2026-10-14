"use client";

import { Minus, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmPayment, startCheckout, type CheckoutResult } from "@/app/actions/checkout";
import { INDIAN_STATES } from "@/lib/india";
import { rupees, shippingFor, type Shipping } from "@/lib/pricing";

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

export function CheckoutForm({
  book,
  shipping,
  defaults,
  mode,
  maxQty,
}: {
  book: { slug: string; title: string; author: string; mrp: number; cover: React.ReactNode };
  shipping: Shipping;
  defaults: Record<string, string>;
  mode: "razorpay" | "mock";
  maxQty: number;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockOrder, setMockOrder] = useState<Started | null>(null);

  const subtotal = book.mrp * qty;
  const ship = shippingFor(subtotal, shipping);
  const total = subtotal + ship;

  async function finish(order: Started, paymentId: string, signature: string) {
    const res = await confirmPayment({
      orderId: order.orderId,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
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
      theme: { color: "#17214A" },
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
        <input type="hidden" name="slug" value={book.slug} />
        <input type="hidden" name="qty" value={qty} />

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
            <Field id="ship_pincode" label="PIN code" inputMode="numeric" maxLength={6} autoComplete="postal-code" defaultValue={defaults.ship_pincode} />
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-5">
            <div className="flex gap-4">
              <div className="w-20 shrink-0">{book.cover}</div>
              <div className="min-w-0">
                <p className="font-heading text-lg font-semibold leading-snug">{book.title}</p>
                <p className="text-sm text-muted">{book.author}</p>
                <p className="mt-1 font-semibold">{rupees(book.mrp)}</p>
              </div>
            </div>

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

            <dl className="space-y-2 border-t border-line pt-4">
              <div className="flex justify-between text-muted">
                <dt>Books</dt>
                <dd className="tabular-nums">{rupees(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{ship === 0 ? "Free" : rupees(ship)}</dd>
              </div>
              {ship > 0 && (
                <p className="text-xs text-muted">Free shipping on orders of {rupees(shipping.free_above)} or more.</p>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{rupees(total)}</dd>
              </div>
            </dl>

            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <button type="submit" className="btn-accent w-full" disabled={busy}>
              {busy ? "Opening payment…" : `Pay ${rupees(total)}`}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {mode === "mock" ? "Test mode: no real money is taken." : "Printed fresh and shipped in 5–9 working days."}
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
              className="btn-accent w-full"
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
