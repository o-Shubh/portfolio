"use client";

import { useState, useTransition } from "react";
import { archiveCampaignLink, createCampaignLink } from "@/app/actions/pro";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function NewCampaignLink({ books }: { books: { id: string; title: string }[] }) {
  const [state, onSubmit, pending] = useFormAction(createCampaignLink);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="cl-book" className="label">
          Book
        </label>
        <select id="cl-book" name="book_id" className="field">
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cl-label" className="label">
          Where you&apos;ll share it
        </label>
        <input id="cl-label" name="label" className="field" placeholder="e.g. Instagram bio" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        Create link
      </button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="text-sm font-medium underline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ArchiveLink({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="text-sm text-muted underline" disabled={pending} onClick={() => start(async () => void (await archiveCampaignLink(id)))}>
      Archive
    </button>
  );
}
