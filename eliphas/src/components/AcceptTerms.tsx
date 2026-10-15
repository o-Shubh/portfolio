"use client";

import Link from "next/link";
import { acceptAuthorTerms } from "@/app/actions/plans";
import { useFormAction } from "@/lib/use-form-action";
import { FormMessage } from "./FormMessage";

/** Explicit acceptance of the current author terms (needed before a new book goes on sale). */
export function AcceptTerms({ summary, version }: { summary: string; version: string }) {
  const [state, onSubmit, pending] = useFormAction(acceptAuthorTerms);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="version" value={version} />
      <h2 className="text-lg">Author terms</h2>
      <p className="text-sm text-muted">{summary}</p>
      <p className="text-sm text-muted">
        Shipping is paid by readers and never taken from your earnings. Books you already sell keep your original terms
        until you accept. Read the full <Link href="/terms" className="underline">terms of use</Link> and{" "}
        <Link href="/pricing" className="underline">pricing</Link>.
      </p>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" className="mt-0.5 h-5 w-5 accent-fg" />
        <span>I accept the author terms (version {version}), including the commission on each copy sold.</span>
      </label>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Accept terms"}
      </button>
    </form>
  );
}
