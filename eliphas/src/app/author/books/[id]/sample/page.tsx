import { AlertTriangle, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SampleReader } from "@/components/SampleReader";
import { getOwnBookOr404 } from "@/lib/author-books";
import { sampleLimit } from "@/lib/book-sample";
import { draftPreviewUrl, latestManuscriptVersion } from "@/lib/sample-drafts";
import { ApproveDraft, DraftForm, RemoveSample } from "./SampleForm";

export const metadata: Metadata = { title: "Free sample", robots: { index: false } };

export default async function BookSamplePage({ params }: PageProps<"/author/books/[id]/sample">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  const limit = sampleLimit(book.page_count ?? 24);
  const [preview, latest] = await Promise.all([draftPreviewUrl(book.sample_draft_path), latestManuscriptVersion(book.id)]);
  const live = Boolean(book.published_at);
  const outdated = Boolean(
    book.sample_path && book.sample_source === "pages" && latest && book.sample_manuscript_version && latest > book.sample_manuscript_version,
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl">Free sample</h2>
        <p className="mt-1 text-sm text-muted">
          Every book page has a &ldquo;Read a sample&rdquo; button. Choose pages from your manuscript or upload your own sample PDF, check the preview, then
          approve it. We publish a separate copy of just those pages; your full manuscript stays private.
          {!live && " New books need an approved sample before they go live."}
        </p>
      </div>

      {book.sample_path ? (
        <div className="card space-y-3" data-testid="current-sample">
          <p className="flex flex-wrap items-center gap-3 text-sm">
            <FileText className="h-5 w-5 text-accent-fg" aria-hidden />
            <span>
              {live ? "Readers see" : "Approved"}: {book.sample_source === "upload" ? "your uploaded sample" : `pages ${book.sample_from}–${book.sample_to}`}.
            </span>
            {live && (
              <Link href={`/books/${book.slug}/sample`} className="font-semibold underline underline-offset-2">
                Open as readers see it
              </Link>
            )}
          </p>
          {outdated && (
            <p role="note" className="flex items-start gap-2 rounded-[var(--radius-control)] bg-marigold/15 p-3 text-sm" data-testid="sample-outdated">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-marigold-fg" aria-hidden />
              You&apos;ve uploaded a newer manuscript since this sample was made. The sample hasn&apos;t changed. Make a new draft below if the pages should be
              updated.
            </p>
          )}
          <RemoveSample bookId={id} />
        </div>
      ) : (
        live && (
          <p role="note" className="card text-sm" data-testid="sample-missing">
            Your book page shows &ldquo;Sample coming soon&rdquo; until you add a sample.
          </p>
        )
      )}

      {book.sample_draft_path && (
        <section className="card space-y-4" aria-labelledby="draft-h" data-testid="sample-draft">
          <div>
            <h3 id="draft-h" className="text-lg">
              Preview your draft
            </h3>
            <p className="text-sm text-muted">
              {book.sample_draft_source === "upload" ? "Your uploaded PDF" : `Pages ${book.sample_draft_from}–${book.sample_draft_to}`}. Only you and our team
              can see this until you approve it.
            </p>
          </div>
          {preview ? (
            <SampleReader url={preview} title={book.title} note="Draft, not public yet" embedded />
          ) : (
            <p className="text-sm text-danger">We couldn&apos;t load the preview. Refresh the page.</p>
          )}
          <ApproveDraft bookId={id} live={live} />
        </section>
      )}

      <DraftForm bookId={id} limit={limit} hasManuscript={Boolean(book.manuscript_path)} hasDraft={Boolean(book.sample_draft_path)} />
      <p className="text-xs text-muted">
        Tip: skip the title and copyright pages and start where the story starts. Anyone can read and save a public sample, so share only pages you&apos;re
        happy to give away.
      </p>
      {!live && (
        <Link href={`/author/books/${id}/preview`} className={book.sample_path ? "btn-primary" : "btn-ghost"} data-testid="sample-continue">
          Continue to Preview
        </Link>
      )}
    </div>
  );
}
