"use client";

import { useState, useTransition } from "react";
import type { RefundActionState } from "@/app/actions/refunds";
import { FormMessage } from "@/components/FormMessage";
import { offlineSafe } from "@/lib/use-form-action";

/** "Check status" and "Retry" for one refund. Each runs once at a time; the message shows what happened. */
export function RefundButtons({ check, retry }: { check?: () => Promise<RefundActionState>; retry?: () => Promise<RefundActionState> }) {
  const [state, setState] = useState<RefundActionState>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<RefundActionState>) => start(async () => setState((await offlineSafe(fn())) as RefundActionState));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {check && (
        <button type="button" className="btn-ghost min-h-9 px-3 text-sm" disabled={pending} onClick={() => run(check)}>
          Check status
        </button>
      )}
      {retry && (
        <button type="button" className="btn-primary min-h-9 px-3 text-sm" disabled={pending} onClick={() => run(retry)}>
          {pending ? "Working…" : "Retry refund"}
        </button>
      )}
      <FormMessage state={state} />
    </div>
  );
}
