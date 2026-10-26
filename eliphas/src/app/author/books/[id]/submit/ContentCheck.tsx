"use client";

import { saveContentSettings } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

/** The 18+ label and the note to reviewers. */
export function ContentSettingsForm({ bookId, ageRating, note, editable }: { bookId: string; ageRating: string; note: string; editable: boolean }) {
  const [state, onSubmit, pending] = useFormAction(saveContentSettings.bind(null, bookId));
  return (
    <form onSubmit={onSubmit} className="space-y-4 border-t border-line pt-4">
      <fieldset disabled={!editable} className="space-y-2">
        <legend className="label">Audience</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="age_rating" value="general" defaultChecked={ageRating !== "mature"} className="mt-1 h-4 w-4 accent-fg" />
          <span>
            <span className="font-medium">Everyone</span>
            <span className="block text-sm text-muted">Shown to all readers.</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="age_rating" value="mature" defaultChecked={ageRating === "mature"} className="mt-1 h-4 w-4 accent-fg" />
          <span>
            <span className="font-medium">18+ (mature themes)</span>
            <span className="block text-sm text-muted">
              Strong language, violence or adult themes. Shown only to readers who confirm they are 18 or older. Sexually explicit material isn&apos;t allowed
              even with this label.
            </span>
          </span>
        </label>
      </fieldset>
      <div>
        <label htmlFor="content_note" className="label">
          Note to reviewers <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="content_note"
          name="content_note"
          rows={3}
          maxLength={1000}
          defaultValue={note}
          disabled={!editable}
          className="field"
          placeholder="If something was flagged on purpose, say why. For example: the slurs are spoken by the villain to show the prejudice the hero faces."
        />
      </div>
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}
