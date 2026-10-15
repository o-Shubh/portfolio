"use client";

import { adjustCredits, refundSubscriptionPeriod } from "@/app/actions/admin-money";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function CreditForm({ authorId }: { authorId: string }) {
  const [state, onSubmit, pending] = useFormAction(adjustCredits.bind(null, authorId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="block w-20">
        <span className="label text-xs">± credits</span>
        <input name="delta" className="field min-h-9" inputMode="numeric" />
      </label>
      <label className="block min-w-40 flex-1">
        <span className="label text-xs">Reason</span>
        <input name="note" className="field min-h-9" />
      </label>
      <button type="submit" className="btn-ghost min-h-9 px-3 text-sm" disabled={pending}>
        Adjust
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function RefundForm({ periodId, notStarted }: { periodId: string; notStarted: boolean }) {
  const [state, onSubmit, pending] = useFormAction(refundSubscriptionPeriod.bind(null, periodId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      {!notStarted && (
        <label className="block w-28">
          <span className="label text-xs">Refund ₹</span>
          <input name="amount" className="field min-h-9" inputMode="decimal" />
        </label>
      )}
      <label className="block min-w-40 flex-1">
        <span className="label text-xs">Reason</span>
        <input name="reason" className="field min-h-9" />
      </label>
      <button type="submit" className="btn min-h-9 bg-danger px-3 text-sm text-white" disabled={pending}>
        {notStarted ? "Refund in full" : "End now and refund"}
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
