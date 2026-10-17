"use client";

import { useState } from "react";
import { moderate, restrictAccount } from "@/app/actions/moderation";
import { useFormAction } from "@/lib/use-form-action";

const LABELS: Record<string, string> = { hide: "Hide", restore: "Restore", remove: "Remove", dismiss: "Dismiss reports" };

/** One decision on an article or comment: pick an action, give a reason, confirm. */
export function ModerateForm({ targetType, targetId, actions }: { targetType: "article" | "comment" | "post" | "post_comment" | "review"; targetId: string; actions: ("hide" | "restore" | "remove" | "dismiss")[] }) {
  const [state, onSubmit, pending] = useFormAction(moderate);
  const [action, setAction] = useState<string | null>(null);
  const id = `mod-${targetId}`;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(action === a ? null : a)}
            aria-expanded={action === a}
            className={`${a === "remove" ? "btn-ghost text-danger" : "btn-ghost"} min-h-9 px-3 text-sm ${action === a ? "ring-2 ring-accent/30" : ""}`}
          >
            {LABELS[a]}
          </button>
        ))}
      </div>
      {action && (
        <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-lg bg-surface-2 p-3">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <input type="hidden" name="action" value={action} />
          <label htmlFor={`${id}-reason`} className="label">
            Reason for “{LABELS[action]}” (kept in the log{action !== "dismiss" && targetType === "article" ? "; the author sees it in My Articles" : ""})
          </label>
          <textarea id={`${id}-reason`} name="reason" required minLength={3} maxLength={500} rows={2} className="field" />
          <button type="submit" className="btn-primary min-h-9 px-4 text-sm" disabled={pending}>
            {pending ? "Saving…" : `Confirm ${LABELS[action].toLowerCase()}`}
          </button>
        </form>
      )}
      {state?.error && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-1 text-sm font-medium text-success">
          {state.ok}
        </p>
      )}
    </div>
  );
}

export function RestrictForm({ userId, name, lift = false }: { userId: string; name: string; lift?: boolean }) {
  const [state, onSubmit, pending] = useFormAction(restrictAccount);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="btn-ghost min-h-9 px-3 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        {lift ? "Lift restriction" : `Restrict ${name}`}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-lg bg-surface-2 p-3">
          <input type="hidden" name="user_id" value={userId} />
          {lift && <input type="hidden" name="lift" value="1" />}
          {!lift && (
            <div>
              <label htmlFor={`days-${userId}`} className="label">
                Days (0 = until lifted)
              </label>
              <input id={`days-${userId}`} name="days" type="number" min={0} max={365} defaultValue={7} className="field w-28" />
            </div>
          )}
          <label htmlFor={`r-${userId}`} className="label">
            Reason
          </label>
          <textarea id={`r-${userId}`} name="reason" required minLength={3} maxLength={500} rows={2} className="field" />
          <button type="submit" className="btn-primary min-h-9 px-4 text-sm" disabled={pending}>
            {pending ? "Saving…" : lift ? "Lift restriction" : "Restrict account"}
          </button>
        </form>
      )}
      {state?.error && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-1 text-sm font-medium text-success">
          {state.ok}
        </p>
      )}
    </div>
  );
}
