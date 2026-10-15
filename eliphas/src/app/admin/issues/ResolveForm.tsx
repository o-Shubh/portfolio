"use client";

import { resolveIssue } from "@/app/actions/issues";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function ResolveForm({ issueId }: { issueId: string }) {
  const [state, onSubmit, pending] = useFormAction(resolveIssue.bind(null, issueId));
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="action" value="replacement" className="h-4 w-4 accent-fg" /> Send a free replacement
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="action" value="refund" className="h-4 w-4 accent-fg" /> Refund in full
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="action" value="rejected" className="h-4 w-4 accent-fg" /> Decline
        </label>
      </div>
      <input name="note" className="field" placeholder="Note for the reader" />
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Resolve
      </button>
    </form>
  );
}
