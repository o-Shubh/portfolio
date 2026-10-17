"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState } from "react";
import { saveDetails } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import { GENRES, type Book } from "@/lib/publishing";

export function DetailsForm({ book, disabled, others }: { book: Book; disabled: boolean; others: { id: string; title: string; binding: string; work_id: string }[] }) {
  const linked = others.find((o) => o.work_id === book.work_id);
  const [state, onSubmit, pending, { onChange }] = useFormAction(saveDetails.bind(null, book.id), { warnUnsaved: true });
  const [desc, setDesc] = useState(book.description ?? "");

  return (
    <form onSubmit={onSubmit} onChange={onChange} className="max-w-2xl space-y-5">
      <fieldset disabled={disabled} className="space-y-5">
        <div>
          <label htmlFor="title" className="label">
            Title
          </label>
          <input id="title" name="title" className="field" defaultValue={book.title} maxLength={200} required />
        </div>
        <div>
          <label htmlFor="subtitle" className="label">
            Subtitle <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="subtitle" name="subtitle" className="field" defaultValue={book.subtitle ?? ""} maxLength={200} />
        </div>
        <div>
          <label htmlFor="author_name" className="label">
            Author name on the cover
          </label>
          <input id="author_name" name="author_name" className="field" defaultValue={book.author_name} maxLength={120} required />
          <p className="mt-1 text-sm text-muted">Use a pen name if you like.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="language" className="label">
              Language
            </label>
            <select id="language" name="language" className="field" defaultValue={book.language}>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label htmlFor="genre" className="label">
              Genre
            </label>
            <select id="genre" name="genre" className="field" defaultValue={book.genre ?? ""}>
              <option value="">Choose a genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="description" className="label">
            Description for readers
          </label>
          <textarea
            id="description"
            name="description"
            rows={7}
            maxLength={4000}
            className="field py-3"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            aria-describedby="desc-help"
          />
          <p id="desc-help" className="mt-1 text-sm text-muted">
            What is the book about, and who will love it? {desc.trim().length < 50 ? `At least 50 characters (${desc.trim().length} so far).` : `${desc.length} / 4000`}
          </p>
        </div>
        <div className="sm:w-1/2">
          <label htmlFor="isbn" className="label">
            ISBN <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="isbn" name="isbn" className="field" inputMode="numeric" defaultValue={book.isbn ?? ""} maxLength={17} />
          <p className="mt-1 text-sm text-muted">Free from isbn.gov.in. You can add it later. Your Eliphas Edition ID is separate and assigned when the book is approved.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="edition_label" className="label">
              Edition <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="edition_label" name="edition_label" className="field" defaultValue={book.edition_label ?? ""} maxLength={60} placeholder="e.g. Second edition" />
          </div>
          {others.length > 0 && (
            <div>
              <label htmlFor="edition_of" className="label">
                Another format or edition of
              </label>
              <select id="edition_of" name="edition_of" className="field" defaultValue={linked?.id ?? ""}>
                <option value="">None (a new work)</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} ({o.binding})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-muted">Each format or edition gets its own Edition ID.</p>
            </div>
          )}
        </div>
      </fieldset>

      <FormMessage state={state} />
      {!disabled && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="next" value="1" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </button>
          <button type="submit" className="btn-ghost" disabled={pending}>
            Save
          </button>
        </div>
      )}
    </form>
  );
}
