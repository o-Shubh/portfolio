"use client";

import { useState, useTransition } from "react";
import { cancelPayoutRun, settleRunPayout, startPayoutRun, type RunState } from "@/app/actions/payout-runs";
import { FormMessage } from "@/components/FormMessage";
import { offlineSafe, useFormAction } from "@/lib/use-form-action";

export function StartRunForm() {
  const [state, submit, pending] = useFormAction(startPayoutRun);
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="minimum" className="label">
          Minimum per author
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden>
            ₹
          </span>
          <input id="minimum" name="minimum" type="number" min="0" step="1" defaultValue={100} inputMode="numeric" className="field mono w-36 pl-8" />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Preparing…" : "Start payout run"}
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function SettleForm({ runId, payoutId }: { runId: string; payoutId: string }) {
  const [state, submit, pending] = useFormAction(settleRunPayout.bind(null, runId, payoutId));
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label htmlFor={`ref-${payoutId}`} className="sr-only">
        Payment reference (UTR)
      </label>
      <input id={`ref-${payoutId}`} name="reference" placeholder="UTR / reference" maxLength={80} className="field min-w-0 flex-1 sm:w-48 sm:flex-none" />
      <button type="submit" name="action" value="paid" className="btn-primary min-h-10 px-3 text-sm" disabled={pending}>
        Mark paid
      </button>
      <button type="submit" name="action" value="cancel" formNoValidate className="btn-quiet min-h-10 px-3 text-sm text-danger" disabled={pending}>
        Remove
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CancelRunButton({ runId }: { runId: string }) {
  const [state, setState] = useState<RunState>();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {confirm ? (
        <>
          <span className="text-sm">Cancel this run? Unpaid amounts go back to the balances.</span>
          <button
            type="button"
            className="btn-danger min-h-10 px-3 text-sm"
            disabled={pending}
            onClick={() => start(async () => setState((await offlineSafe(cancelPayoutRun(runId))) as RunState))}
          >
            Yes, cancel run
          </button>
          <button type="button" className="btn-quiet min-h-10 px-3 text-sm" onClick={() => setConfirm(false)}>
            Keep it
          </button>
        </>
      ) : (
        <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setConfirm(true)}>
          Cancel run
        </button>
      )}
      <FormMessage state={state} />
    </span>
  );
}
