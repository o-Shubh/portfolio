"use client";

import { useActionState } from "react";
import { createBook } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";

export function NewBookForm() {
  const [state, action, pending] = useActionState(createBook, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label htmlFor="title" className="label">
          Book title
        </label>
        <input id="title" name="title" className="field" maxLength={200} required autoFocus />
      </div>
      <fieldset>
        <legend className="label">Language of the book</legend>
        <div className="grid grid-cols-2 gap-3">
          <Choice name="language" value="hi" label="हिन्दी" sub="Hindi" />
          <Choice name="language" value="en" label="English" sub="अंग्रेज़ी" />
        </div>
      </fieldset>
      <FormMessage state={state} />
      <button type="submit" className="btn-accent w-full sm:w-auto" disabled={pending}>
        {pending ? "Creating…" : "Create and continue"}
      </button>
    </form>
  );
}

function Choice({ name, value, label, sub }: { name: string; value: string; label: string; sub: string }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-marigold has-[:checked]:bg-marigold/10">
      <input type="radio" name={name} value={value} required className="h-5 w-5 accent-[#C98200]" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-muted">{sub}</span>
      </span>
    </label>
  );
}
