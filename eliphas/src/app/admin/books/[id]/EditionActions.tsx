"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveForFinalFiles, approveRevisedFiles, keepApprovedFiles, removeEdition, restoreEdition, type EditionState } from "@/app/actions/editions";
import { FormMessage } from "@/components/FormMessage";

/** Edition steps next to the review decision: final files with the QR label, revised-file review, removal. */
export function EditionActions({
  bookId,
  status,
  hasEeid,
  revisedWaiting,
  removed,
  revisedLink,
}: {
  bookId: string;
  status: string;
  hasEeid: boolean;
  revisedWaiting: boolean;
  removed: boolean;
  revisedLink: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<EditionState>();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const run = (fn: () => Promise<EditionState>) =>
    start(async () => {
      setMsg(undefined);
      const res = await fn();
      setMsg(res);
      if (!res?.error) {
        setNote("");
        setReason("");
        setConfirmRemove(false);
        router.refresh();
      }
    });

  return (
    <div className="space-y-5">
      {status === "in_review" && !removed && (
        <div className="space-y-2" data-testid="final-files">
          <h2 className="text-lg">Approve, then final files</h2>
          <p className="text-sm text-muted">
            Assigns the Edition ID now and asks the author to add the QR label to the print cover. When they send it back, &ldquo;Approve and
            publish&rdquo; keeps the same ID.{hasEeid ? " This book already has its ID." : ""}
          </p>
          <label htmlFor="ff-note" className="label">
            Note to the author (optional)
          </label>
          <textarea id="ff-note" rows={3} className="field py-2.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Leave empty for the standard instructions." />
          <button type="button" className="btn-ghost w-full" disabled={pending} onClick={() => run(() => approveForFinalFiles(bookId, note))}>
            Approve, assign EEID and request final files
          </button>
        </div>
      )}

      {revisedWaiting && (
        <div className="space-y-2 rounded-[var(--radius-control)] bg-surface-2 p-3" data-testid="revised-review">
          <h2 className="text-lg">Revised print cover</h2>
          <p className="text-sm">
            The author uploaded a new print cover while the book is live. Orders keep printing the approved cover until you approve this one.
          </p>
          {revisedLink && (
            <a href={revisedLink} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
              Open the revised print cover
            </a>
          )}
          <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => run(() => approveRevisedFiles(bookId))}>
            Approve revised files for printing
          </button>
          <label htmlFor="rv-note" className="label">
            Or keep the approved cover, with a note
          </label>
          <textarea id="rv-note" rows={2} className="field py-2.5" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className="btn-ghost w-full" disabled={pending} onClick={() => run(() => keepApprovedFiles(bookId, note))}>
            Keep the approved cover
          </button>
        </div>
      )}

      <div className="space-y-2 border-t border-line pt-4">
        {removed ? (
          <>
            <p className="text-sm font-semibold text-danger">Removed by our team. Its edition page shows a neutral notice.</p>
            <button type="button" className="btn-ghost w-full" disabled={pending} onClick={() => run(() => restoreEdition(bookId))}>
              Restore (stays unpublished)
            </button>
          </>
        ) : confirmRemove ? (
          <>
            <label htmlFor="rm-reason" className="label">
              Reason for removal (kept in the log, never shown publicly)
            </label>
            <textarea id="rm-reason" rows={2} className="field py-2.5" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-danger flex-1" disabled={pending || reason.trim().length < 5} onClick={() => run(() => removeEdition(bookId, reason))}>
                Remove edition
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmRemove(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="min-h-11 text-sm font-medium text-danger underline" onClick={() => setConfirmRemove(true)}>
            Remove edition (legal or policy)…
          </button>
        )}
      </div>
      <FormMessage state={msg} />
    </div>
  );
}
