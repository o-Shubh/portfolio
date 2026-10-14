"use client";

import { useFormAction } from "@/lib/use-form-action";
import { advanceOrder } from "@/app/actions/printer";
import { FormMessage } from "@/components/FormMessage";
import { PRINTER_NEXT, type OrderStatus } from "@/lib/order-status";

const COURIERS = ["India Post", "Delhivery", "DTDC", "Blue Dart", "Ekart", "Xpressbees", "Shiprocket"];

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
        </>
      )}
      <FormMessage state={state} />
      <button type="submit" className="btn-accent w-full" disabled={pending}>
        {pending ? "Saving…" : next.label}
      </button>
    </form>
  );
}
