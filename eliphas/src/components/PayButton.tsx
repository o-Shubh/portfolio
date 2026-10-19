"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPaise } from "@/lib/commission";

type Start = { paymentId: string; mode: "razorpay" | "mock"; razorpayOrderId: string; keyId: string; amountPaise: number; description: string };
type Confirm = (input: {
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => Promise<{ ok: true; pending?: boolean } | { error: string }>;

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };

function loadRazorpay(): Promise<boolean> {
  const w = window as unknown as { Razorpay?: unknown };
  if (w.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Pays through Razorpay Checkout (or a test-payment window when keys aren't set). The server
 * creates the payment and verifies it; nothing is activated from this browser callback alone.
 */
export function PayButton({
  label,
  start,
  confirm,
  doneHref,
  className = "btn-accent",
}: {
  label: string;
  start: () => Promise<{ error: string } | { start: Start }>;
  confirm: Confirm;
  doneHref?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mock, setMock] = useState<Start | null>(null);

  async function finish(s: Start, paymentId: string, signature: string) {
    const res = await confirm({ paymentId: s.paymentId, razorpayOrderId: s.razorpayOrderId, razorpayPaymentId: paymentId, razorpaySignature: signature });
    setBusy(false);
    setMock(null);
    if ("error" in res) return setError(res.error);
    if (res.pending) {
      // Authorised but not captured yet: Razorpay's webhook completes it, usually within a minute
      setNotice("Payment received. We're confirming it with your bank; this usually takes under a minute. Refresh the page shortly.");
      return router.refresh();
    }
    if (doneHref) router.push(doneHref);
    router.refresh();
  }

  async function onClick() {
    setError(null);
    setBusy(true);
    const r = await start();
    if ("error" in r) {
      setBusy(false);
      return setError(r.error);
    }
    const s = r.start;
    if (s.mode === "mock") return setMock(s);
    if (!(await loadRazorpay())) {
      setBusy(false);
      return setError("Couldn't load the payment window. Check your connection and try again.");
    }
    const Rzp = (window as unknown as { Razorpay: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } }).Razorpay;
    const rzp = new Rzp({
      key: s.keyId,
      amount: s.amountPaise,
      currency: "INR",
      order_id: s.razorpayOrderId,
      name: "Eliphas Indicus",
      description: s.description,
      theme: { color: "#17214a" },
      handler: (resp: RazorpayResponse) => finish(s, resp.razorpay_payment_id, resp.razorpay_signature),
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
    <div className="space-y-2">
      <button type="button" className={className} onClick={onClick} disabled={busy}>
        {busy ? "Opening payment…" : label}
      </button>
      {notice && (
        <p role="status" className="notice-info">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {mock && (
        <div role="dialog" aria-modal="true" aria-labelledby="mockpay-title" className="dialog-backdrop">
          <div className="dialog-panel space-y-4 text-center">
            <span className="eyebrow">Test payment</span>
            <h2 id="mockpay-title" className="text-2xl">
              Pay {formatPaise(mock.amountPaise)}
            </h2>
            <p className="text-sm text-muted">Razorpay keys aren&apos;t set, so this pretend payment stands in for it. {mock.description}.</p>
            <button type="button" className="btn-primary w-full" onClick={() => finish(mock, `mock_pay_${Date.now()}`, "mock")}>
              Pay successfully
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => {
                setMock(null);
                setBusy(false);
                setError("Payment was not completed. You can try again.");
              }}
            >
              Cancel payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
