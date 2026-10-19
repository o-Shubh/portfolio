"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveSample, discardSampleDraft, draftSampleFromPages, removeBookSample } from "@/app/actions/samples";
import { useFormAction } from "@/lib/use-form-action";

function Message({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="text-sm font-medium text-success">
        {state.ok}
      </p>
    );
  return null;
}

/** Step 1: make a private draft, from a page range of the manuscript or an uploaded PDF. */
export function DraftForm({ bookId, limit, hasManuscript, hasDraft }: { bookId: string; limit: number; hasManuscript: boolean; hasDraft: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"pages" | "upload">(hasManuscript ? "pages" : "upload");
  const [state, onSubmit, pending] = useFormAction(draftSampleFromPages);
  const [upload, setUpload] = useState<{ error?: string; ok?: string }>();
  const [uploading, setUploading] = useState(false);

  return (
    <div className="card space-y-4">
      <fieldset>
        <legend className="font-semibold">{hasDraft ? "Make a different draft" : "How do you want to make the sample?"}</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="sample-mode"
              checked={mode === "pages"}
              onChange={() => setMode("pages")}
              disabled={!hasManuscript}
              className="h-4 w-4 accent-fg"
            />
            Choose pages from my manuscript
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="sample-mode" checked={mode === "upload"} onChange={() => setMode("upload")} className="h-4 w-4 accent-fg" />
            Upload a sample PDF
          </label>
        </div>
      </fieldset>

      {mode === "pages" ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="book_id" value={bookId} />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="s-from" className="label">
                From page
              </label>
              <input id="s-from" name="from" type="number" min={1} required defaultValue={1} className="field w-28" inputMode="numeric" />
            </div>
            <div>
              <label htmlFor="s-to" className="label">
                To page
              </label>
              <input id="s-to" name="to" type="number" min={1} required defaultValue={limit} className="field w-28" inputMode="numeric" />
            </div>
            <p className="pb-3 text-sm text-muted">Up to {limit} pages.</p>
          </div>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Making draft…" : "Make draft"}
          </button>
          <Message state={state} />
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
            if (!file) return setUpload({ error: "Choose a PDF file." });
            setUploading(true);
            setUpload(undefined);
            try {
              const body = new FormData();
              body.set("file", file);
              const res = await fetch(`/api/books/${bookId}/sample`, { method: "POST", body });
              const json = await res.json().catch(() => ({ error: "Upload failed. Try again." }));
              if (!res.ok) setUpload({ error: json.error ?? "Upload failed. Try again." });
              else {
                setUpload({ ok: `Draft ready: ${json.pages} page${json.pages === 1 ? "" : "s"}. Check the preview, then approve it.` });
                router.refresh();
              }
            } catch {
              setUpload({ error: "You seem to be offline. Try again when you're connected." });
            } finally {
              setUploading(false);
            }
          }}
        >
          <div>
            <label htmlFor="s-file" className="label">
              Sample PDF
            </label>
            <input id="s-file" name="file" type="file" accept="application/pdf,.pdf" className="field py-2" />
            <p className="mt-1 text-xs text-muted">
              Up to {limit} pages and 9 MB. We remove the file&apos;s hidden details (author, software) before saving it.
            </p>
          </div>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload draft"}
          </button>
          <Message state={upload} />
        </form>
      )}
    </div>
  );
}

/** Step 2: approve the previewed draft (publishes a separate copy) or discard it. */
export function ApproveDraft({ bookId, live }: { bookId: string; live: boolean }) {
  const [state, onSubmit, pending] = useFormAction(approveSample);
  const [dState, onDiscard, discarding] = useFormAction(discardSampleDraft);
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="hidden" name="book_id" value={bookId} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="rights" className="mt-0.5 h-5 w-5 shrink-0 accent-fg" required />
          <span>I&apos;ve checked the preview and I&apos;m happy for these pages to be read and downloaded free by anyone.</span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={pending} data-testid="approve-sample">
            {pending ? "Publishing…" : live ? "Approve and publish sample" : "Approve sample"}
          </button>
        </div>
      </form>
      <form onSubmit={onDiscard}>
        <input type="hidden" name="book_id" value={bookId} />
        <button type="submit" className="btn-quiet min-h-10 text-sm" disabled={discarding}>
          {discarding ? "Discarding…" : "Discard draft"}
        </button>
      </form>
      <Message state={state ?? dState} />
    </div>
  );
}

export function RemoveSample({ bookId }: { bookId: string }) {
  const [state, onSubmit, pending] = useFormAction(removeBookSample);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="book_id" value={bookId} />
      <button type="submit" className="text-sm font-medium text-danger underline underline-offset-2" disabled={pending}>
        {pending ? "Removing…" : "Stop sharing the sample"}
      </button>
      <Message state={state} />
    </form>
  );
}
