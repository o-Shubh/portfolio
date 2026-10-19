"use client";

import { useState, useTransition } from "react";
import type { EmailActionState } from "@/app/actions/emails";
import { FormMessage } from "@/components/FormMessage";
import { offlineSafe } from "@/lib/use-form-action";

export function RetryButton({ action, label = "Retry" }: { action: () => Promise<EmailActionState>; label?: string }) {
  const [state, setState] = useState<EmailActionState>();
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-ghost min-h-9 px-3 text-sm"
        disabled={pending}
        onClick={() => start(async () => setState((await offlineSafe(action())) as EmailActionState))}
      >
        {pending ? "Sending…" : label}
      </button>
      <FormMessage state={state} />
    </span>
  );
}
