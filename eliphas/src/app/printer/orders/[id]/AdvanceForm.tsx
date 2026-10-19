"use client";

import { useFormAction } from "@/lib/use-form-action";
import { advanceOrder } from "@/app/actions/printer";
import { FormMessage } from "@/components/FormMessage";
import { COURIERS } from "@/lib/couriers";
import { PRINTER_NEXT, type OrderStatus } from "@/lib/order-status";

export function AdvanceForm({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [state, onSubmit, pending] = useFormAction(advanceOrder.bind(null, orderId));
  const next = PRINTER_NEXT[status];

  if (!next) {
    return <p className="text-muted">{status === "delivered" ? "Delivered. Nothing left to do." : "Nothing to do for this order."}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg">Next step</h2>
      <input type="hidden" name="to" value={next.to} />
      {next.to === "shipped" && (
        <>
          <div>
            <label htmlFor="courier" className="label">
              Courier
            </label>
            <input id="courier" name="courier" list="couriers" className="field" required />
            <datalist id="couriers">
              {COURIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="tracking_number" className="label">
              Tracking number
            </label>
            <input id="tracking_number" name="tracking_number" className="field" autoCapitalize="characters" required />
          </div>
          <div>
            <label htmlFor="tracking_url" className="label">
              Tracking link <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="tracking_url"
              name="tracking_url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              className="field"
              aria-describedby="tracking_url-hint"
            />
            <p id="tracking_url-hint" className="hint">
              Paste the link from the courier&apos;s receipt so the reader can track the parcel in one tap.
            </p>
          </div>
        </>
      )}
      <FormMessage state={state} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : next.label}
      </button>
    </form>
  );
}
