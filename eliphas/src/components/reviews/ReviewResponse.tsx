"use client";

import { useState } from "react";
import { respondToReview } from "@/app/actions/reviews";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

/** The book's author answers a review publicly. They can't edit or remove the review itself. */
export function ReviewResponse({ reviewId, initial }: { reviewId: string; initial: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(respondToReview.bind(null, reviewId));
  if (!open)
    return (
      <>
        <button type="button" className="min-h-11 text-xs font-semibold text-accent-fg underline-offset-2 hover:underline" onClick={() => setOpen(true)} data-testid="respond-review">
          {initial ? "Edit your response" : "Respond as the author"}
        </button>
        {state?.ok && (
          <span role="status" className="text-xs text-success">
            {state.ok}
          </span>
        )}
      </>
    );
  return (
    <form onSubmit={onSubmit} className="mt-2 w-full space-y-2">
      <label htmlFor={`resp-${reviewId}`} className="label">
        Your public response
      </label>
      <textarea id={`resp-${reviewId}`} name="response" rows={3} maxLength={1000} defaultValue={initial ?? ""} className="field py-2.5" />
      <p className="text-xs text-muted">Shown under the review, labelled as your response. Leave it empty to remove it.</p>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary min-h-10" disabled={pending}>
          {pending ? "Saving…" : "Post response"}
        </button>
        <button type="button" className="btn-ghost min-h-10" onClick={() => setOpen(false)}>
          {state?.ok ? "Close" : "Cancel"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
