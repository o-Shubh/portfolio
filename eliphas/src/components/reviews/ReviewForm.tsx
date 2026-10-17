"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteReview, saveReview } from "@/app/actions/reviews";
import { FormMessage } from "@/components/FormMessage";
import { offlineSafe, useFormAction } from "@/lib/use-form-action";

/** Star rating (radio buttons, so it works with a keyboard and screen readers) and optional text. */
export function ReviewForm({ bookId, initial }: { bookId: string; initial: { rating: number; body: string } | null }) {
  const [state, onSubmit, pending] = useFormAction(saveReview.bind(null, bookId));
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | undefined>();
  const [busy, start] = useTransition();
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <fieldset>
        <legend className="label">{initial ? "Your review" : "Rate this book"}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full hover:bg-surface-2">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <Star className={`h-6 w-6 ${n <= rating ? "fill-marigold text-marigold" : "text-muted"}`} aria-hidden />
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-body" className="label">
          Review (optional)
        </label>
        <textarea id="review-body" name="body" rows={3} maxLength={1500} defaultValue={initial?.body ?? ""} className="field py-3" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || rating === 0}>
          {pending ? "Saving…" : initial ? "Update review" : "Post review"}
        </button>
        {initial && (
          <button type="button" className="min-h-11 text-sm font-medium text-danger underline" disabled={busy} onClick={() => start(async () => setMsg(await offlineSafe(deleteReview(bookId))))}>
            Delete review
          </button>
        )}
        {rating === 0 && <span className="text-sm text-muted">Choose a rating to post.</span>}
      </div>
      <FormMessage state={state ?? msg} />
    </form>
  );
}
