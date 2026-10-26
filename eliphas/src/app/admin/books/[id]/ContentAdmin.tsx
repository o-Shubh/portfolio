"use client";

import { setAgeRating } from "@/app/actions/content";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function AgeRatingForm({ bookId, rating }: { bookId: string; rating: string }) {
  const [state, onSubmit, pending] = useFormAction(setAgeRating.bind(null, bookId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="admin-age" className="label">
          Audience
        </label>
        <select id="admin-age" name="age_rating" defaultValue={rating} className="field w-auto">
          <option value="general">Everyone</option>
          <option value="mature">18+</option>
        </select>
      </div>
      <button type="submit" className="btn-ghost min-h-11 px-3" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
