"use client";

import { useFormAction } from "@/lib/use-form-action";
import { recordPayout } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";

export function PayoutForm({ authorId, balance }: { authorId: string; balance: number }) {
  const [state, onSubmit, pending] = useFormAction(recordPayout.bind(null, authorId));
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label" htmlFor={`amount-${authorId}`}>
          Amount (₹)
        </label>
        <input id={`amount-${authorId}`} name="amount" type="number" step="0.01" min="1" max={balance} defaultValue={balance} className="field" required />
      </div>
      <div>
        <label className="label" htmlFor={`ref-${authorId}`}>
          UTR / reference
        </label>
        <input id={`ref-${authorId}`} name="reference" className="field" required />
      </div>
      <div>
        <label className="label" htmlFor={`note-${authorId}`}>
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id={`note-${authorId}`} name="note" className="field" placeholder="e.g. September earnings" />
      </div>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
        <button type="submit" className="btn-primary mt-2" disabled={pending || Boolean(state?.ok)}>
          {pending ? "Saving…" : "Record payout"}
        </button>
      </div>
    </form>
  );
}
