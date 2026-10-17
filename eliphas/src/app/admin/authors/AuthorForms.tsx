"use client";

import { useState } from "react";
import { decideApplication, revokeVerification, verifyExistingAuthor } from "@/app/actions/verification";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function DecisionForm({ applicationId }: { applicationId: string }) {
  const [state, onSubmit, pending] = useFormAction(decideApplication);
  const [decision, setDecision] = useState<string | null>(null);
  const label = { approve: "Approve", changes: "Request changes", reject: "Reject" } as Record<string, string>;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {Object.entries(label).map(([k, v]) => (
          <button key={k} type="button" className={`${k === "reject" ? "btn-ghost text-danger" : k === "approve" ? "btn-primary" : "btn-ghost"} min-h-10 px-3 text-sm`} aria-expanded={decision === k} onClick={() => setDecision(decision === k ? null : k)}>
            {v}
          </button>
        ))}
      </div>
      {decision && (
        <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-[var(--radius-control)] bg-surface-2 p-3">
          <input type="hidden" name="application_id" value={applicationId} />
          <input type="hidden" name="decision" value={decision} />
          <label htmlFor={`note-${applicationId}`} className="label">
            {decision === "approve" ? "Note (optional, kept in the log)" : "Reason shown to the applicant"}
          </label>
          <textarea id={`note-${applicationId}`} name="note" rows={2} maxLength={1000} className="field py-2" required={decision !== "approve"} />
          <button type="submit" className="btn-primary min-h-10 px-4 text-sm" disabled={pending}>
            {pending ? "Saving…" : `Confirm: ${label[decision].toLowerCase()}`}
          </button>
        </form>
      )}
      <FormMessage state={state} />
    </div>
  );
}

export function NoteAction({ userId, kind }: { userId: string; kind: "verify" | "revoke" }) {
  const [state, onSubmit, pending] = useFormAction(kind === "verify" ? verifyExistingAuthor : revokeVerification);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className={`btn-ghost min-h-10 px-3 text-sm ${kind === "revoke" ? "text-danger" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        {kind === "verify" ? "Verify…" : "Remove badge…"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-[var(--radius-control)] bg-surface-2 p-3">
          <input type="hidden" name="user_id" value={userId} />
          <label htmlFor={`${kind}-${userId}`} className="label">
            {kind === "verify" ? "What did you check? (kept in the log)" : "Reason (shown to the author and kept in the log)"}
          </label>
          <textarea id={`${kind}-${userId}`} name="note" rows={2} maxLength={500} required className="field py-2" />
          <button type="submit" className="btn-primary min-h-10 px-4 text-sm" disabled={pending}>
            {pending ? "Saving…" : kind === "verify" ? "Confirm verification" : "Remove badge"}
          </button>
        </form>
      )}
      <FormMessage state={state} />
    </div>
  );
}
