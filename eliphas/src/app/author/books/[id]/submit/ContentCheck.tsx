"use client";

import { saveContentSettings } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

/** The note to reviewers about flagged content. */
export function ContentSettingsForm({ bookId, note, editable }: { bookId: string; note: string; editable: boolean }) {
  const [state, onSubmit, pending] = useFormAction(saveContentSettings.bind(null, bookId));
  return (
    <form onSubmit={onSubmit} className="space-y-4 border-t border-line pt-4">
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
