"use client";

import { useFormAction } from "@/lib/use-form-action";
import { reassignOrder } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";

export function ReassignForm({
  orderId,
  current,
  printers,
}: {
  orderId: string;
  current: string | null;
  printers: { id: string; name: string; city: string }[];
}) {
  const [state, onSubmit, pending] = useFormAction(reassignOrder.bind(null, orderId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor={`p-${orderId}`} className="sr-only">
        Move to printer
      </label>
      <select id={`p-${orderId}`} name="printer_id" defaultValue={current ?? ""} className="field min-h-10 w-auto py-0 text-sm">
        <option value="" disabled>
          Choose printer
        </option>
        {printers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.city})
          </option>
        ))}
      </select>
      <button type="submit" className="btn-ghost min-h-10 px-4 text-sm" disabled={pending}>
        Move
      </button>
      <FormMessage state={state} />
    </form>
  );
}
