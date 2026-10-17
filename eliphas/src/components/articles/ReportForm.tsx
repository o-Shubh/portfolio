"use client";

import { useState, useTransition } from "react";
import { reportContent } from "@/app/actions/community";
import { useGate } from "./useGate";
import { offlineSafe } from "@/lib/use-form-action";

const REASONS = [
  { value: "spam", label: "Spam or advertising" },
  { value: "abuse", label: "Harassment or abuse" },
  { value: "hate", label: "Hate speech" },
  { value: "copyright", label: "Copies someone else's work" },
  { value: "private-info", label: "Shares private information" },
  { value: "other", label: "Something else" },
] as const;

/** Inline report form. Reports go to the Eliphas team; the author never sees who reported. */
export function ReportForm({ targetType, targetId, onDone, intent }: { targetType: "article" | "comment"; targetId: string; onDone: () => void; intent: string }) {
  const gate = useGate();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const idp = `report-${targetId}`;

  if (sent) {
    return (
      <div role="status" className="rounded-lg bg-surface-2 p-3 text-sm">
        Thanks. Our team will review this. We don&apos;t tell the author who reported it.{" "}
        <button type="button" className="font-semibold underline underline-offset-2" onClick={onDone}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-lg bg-surface-2 p-3 text-sm"
      aria-label={`Report this ${targetType}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) return setError("Choose a reason.");
        setError(null);
        start(async () => {
          const res = await offlineSafe(reportContent(targetType, targetId, reason, details));
          const msg = gate(res, intent);
          if (msg) setError(msg);
          else if ("ok" in res) setSent(true);
        });
      }}
    >
      <fieldset>
        <legend className="font-semibold">Why are you reporting this {targetType}?</legend>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex min-h-10 cursor-pointer items-center gap-2">
              <input type="radio" name={`${idp}-reason`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4 accent-fg" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${idp}-details`} className="label">
          Details (optional)
        </label>
        <textarea id={`${idp}-details`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={2} className="field" />
      </div>
      {error && (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary min-h-10" disabled={pending}>
          {pending ? "Sending…" : "Send report"}
        </button>
        <button type="button" className="btn-ghost min-h-10" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
