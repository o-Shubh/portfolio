"use client";

import { useState, useTransition } from "react";
import { cancelMyOrder, type OrderActionState } from "@/app/actions/orders";
import { FormMessage } from "@/components/FormMessage";

/** Cancel button with a confirm step on the page itself. */
export function CancelOrder({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<OrderActionState>();
  const [pending, startTransition] = useTransition();

  if (state?.ok) return <FormMessage state={state} />;

  return (
    <div className="space-y-3">
      {!confirming ? (
        <button type="button" className="btn-ghost w-full" onClick={() => setConfirming(true)}>
          Cancel order
        </button>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line p-4">
          <p className="font-medium">Cancel this order?</p>
          <p className="mt-1 text-sm text-muted">You get a full refund to your original payment method.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn bg-danger text-white hover:opacity-90"
              disabled={pending}
              onClick={() => startTransition(async () => setState(await cancelMyOrder(orderId)))}
            >
              {pending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button type="button" className="btn-ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Keep order
            </button>
          </div>
        </div>
      )}
      <FormMessage state={state} />
    </div>
  );
}
