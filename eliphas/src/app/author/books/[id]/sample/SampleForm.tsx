"use client";

import { removeBookSample, setBookSample } from "@/app/actions/samples";
import { useFormAction } from "@/lib/use-form-action";

export function SampleForm({ bookId, limit, from, to, hasSample }: { bookId: string; limit: number; from: number | null; to: number | null; hasSample: boolean }) {
  const [state, onSubmit, pending] = useFormAction(setBookSample);
  const [rmState, onRemove, removing] = useFormAction(removeBookSample);
  const msg = state ?? rmState;
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="card space-y-4">
        <input type="hidden" name="book_id" value={bookId} />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="s-from" className="label">
              From page
            </label>
            <input id="s-from" name="from" type="number" min={1} required defaultValue={from ?? 1} className="field w-28" inputMode="numeric" />
          </div>
          <div>
            <label htmlFor="s-to" className="label">
              To page
            </label>
            <input id="s-to" name="to" type="number" min={1} required defaultValue={to ?? limit} className="field w-28" inputMode="numeric" />
          </div>
          <p className="pb-3 text-sm text-muted">Up to {limit} pages.</p>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="rights" className="mt-0.5 h-5 w-5 shrink-0 accent-fg" required />
          <span>I&apos;m happy for these pages to be read and downloaded free by anyone.</span>
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Making sample…" : hasSample ? "Update sample" : "Make sample"}
        </button>
      </form>
      {hasSample && (
        <form onSubmit={onRemove}>
          <input type="hidden" name="book_id" value={bookId} />
          <button type="submit" className="text-sm font-medium text-danger underline" disabled={removing}>
            {removing ? "Removing…" : "Stop sharing the sample"}
          </button>
        </form>
      )}
      {msg?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {msg.error}
        </p>
      )}
      {msg?.ok && (
        <p role="status" className="text-sm font-medium text-success">
          {msg.ok}
        </p>
      )}
    </div>
  );
}
