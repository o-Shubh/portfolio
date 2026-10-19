"use client";

import { requestCreative } from "@/app/actions/pro";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function CreativeForm({ books }: { books: { id: string; title: string }[] }) {
  const [state, onSubmit, pending] = useFormAction(requestCreative);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="book_id" className="label">
          Book
        </label>
        <select id="book_id" name="book_id" className="field" required>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="format" className="label">
          Format
        </label>
        <select id="format" name="format" className="field">
          <option>Instagram post (square)</option>
          <option>Instagram / WhatsApp story</option>
          <option>Facebook / X post</option>
          <option>Launch announcement</option>
        </select>
      </div>
      <div>
        <label htmlFor="brief" className="label">
          What should it say or show?
        </label>
        <textarea
          id="brief"
          name="brief"
          rows={4}
          className="field py-2.5"
          placeholder="e.g. Launch day post with the cover, a short quote from chapter 3 and 'Order now'."
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="rights" className="mt-0.5 h-5 w-5 accent-fg" />
        <span>I have the rights to the book cover, text and any images to be used.</span>
      </label>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Use 1 credit and request"}
      </button>
    </form>
  );
}
