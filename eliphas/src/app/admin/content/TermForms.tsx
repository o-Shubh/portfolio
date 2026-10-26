"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { addContentTerm, removeContentTerm } from "@/app/actions/content";
import { FormMessage } from "@/components/FormMessage";
import { offlineSafe, useFormAction } from "@/lib/use-form-action";

export function AddTermForm() {
  const [state, onSubmit, pending] = useFormAction(addContentTerm);
  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="text-lg">Add a word or phrase</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <div>
          <label htmlFor="term" className="label">
            Word or phrase
          </label>
          <input id="term" name="term" maxLength={80} required className="field" placeholder="In English, Hindi or Hinglish" />
        </div>
        <div>
          <label htmlFor="category" className="label">
            List
          </label>
          <select id="category" name="category" className="field" defaultValue="language">
            <option value="language">Abusive language</option>
            <option value="hate">Hate speech</option>
            <option value="adult">Sexual content</option>
            <option value="violence">Violence and self-harm</option>
            <option value="allow">Allowed (never flagged)</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function RemoveTerm({ term, category }: { term: string; category: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-3"
      aria-label={`Remove ${term}`}
      disabled={pending}
      onClick={() => start(async () => void (await offlineSafe(removeContentTerm(term, category))))}
    >
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
