"use client";

import { useState, useTransition } from "react";
import { adminCancelOrder, retryRefund, type OrderActionState } from "@/app/actions/orders";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

/** Cancel with a reason (shown to the buyer). Paid orders are refunded automatically. */
export function CancelForm({ orderId, paid }: { orderId: string; paid: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(adminCancelOrder.bind(null, orderId));
  if (state?.ok) return <FormMessage state={state} />;
  if (!open)
    return (
      <button type="button" className="min-h-11 text-sm text-danger underline underline-offset-2" onClick={() => setOpen(true)}>
        Cancel order
      </button>
    );
  return (
    <form onSubmit={onSubmit} className="w-full space-y-2 rounded-xl border border-line p-3">
      <label htmlFor={`reason-${orderId}`} className="label">
        Reason (the buyer sees this)
      </label>
      <input id={`reason-${orderId}`} name="reason" className="field" maxLength={200} placeholder="e.g. Book is out of print at the press" />
      <p className="text-xs text-muted">{paid ? "The full amount is refunded to the buyer through Razorpay." : "This order was never paid, so nothing is refunded."}</p>
      <div className="flex gap-2">
        <button type="submit" className="btn min-h-10 bg-danger px-4 text-sm text-white hover:opacity-90" disabled={pending}>
          {pending ? "Cancelling…" : paid ? "Cancel and refund" : "Cancel order"}
        </button>
        <button type="button" className="btn-ghost min-h-10 px-4 text-sm" onClick={() => setOpen(false)} disabled={pending}>
          Keep
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function RetryRefund({ orderId }: { orderId: string }) {
  const [state, setState] = useState<OrderActionState>();
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-ghost min-h-9 px-3 text-sm"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await retryRefund(orderId)))}
      >
        {pending ? "Trying…" : "Retry refund"}
      </button>
      <FormMessage state={state} />
    </span>
  );
}
