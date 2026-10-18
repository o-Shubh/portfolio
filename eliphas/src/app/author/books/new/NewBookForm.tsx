"use client";

import { useFormAction } from "@/lib/use-form-action";
import { createBook } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";

export function NewBookForm() {
  const [state, onSubmit, pending] = useFormAction(createBook);
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label htmlFor="title" className="label">
          Book title
        </label>
        <input id="title" name="title" className="field" maxLength={200} required autoFocus />
      </div>
      <fieldset>
        <legend className="label">Language of the book</legend>
        <div className="grid grid-cols-2 gap-3">
          <Choice name="language" value="hi" label="Hindi" sub="Devanagari script" />
          <Choice name="language" value="en" label="English" sub="Latin script" />
        </div>
      </fieldset>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Creating…" : "Create and continue"}
      </button>
    </form>
  );
}

function Choice({ name, value, label, sub }: { name: string; value: string; label: string; sub: string }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-card)] bg-surface-2 ring-1 ring-transparent transition hover:ring-line p-3 has-[:checked]:ring-2 has-[:checked]:ring-accent has-[:checked]:bg-accent/10">
      <input type="radio" name={name} value={value} required className="h-5 w-5 accent-fg" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-muted">{sub}</span>
      </span>
    </label>
  );
}
