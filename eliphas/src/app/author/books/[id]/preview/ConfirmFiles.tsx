"use client";

import { confirmFiles } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function ConfirmFiles({ bookId, confirmed, ready, disabled }: { bookId: string; confirmed: boolean; ready: boolean; disabled: boolean }) {
  const [state, onSubmit, pending] = useFormAction(confirmFiles.bind(null, bookId));
  if (disabled) return <p className="text-sm text-muted">Files can&apos;t be changed while the book is in review or live.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="confirm"
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
          defaultChecked={confirmed}
          disabled={!ready}
          required
        />
        <span>I&apos;ve opened and checked these files. They are the final versions I want printed, and I have the rights to publish them.</span>
      </label>
      {!ready && <p className="text-sm text-muted">Upload the manuscript, print cover and front cover image on the Files step first.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="next" value="1" className="btn-primary" disabled={pending || !ready}>
          {pending ? "Saving…" : "Confirm and continue"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
