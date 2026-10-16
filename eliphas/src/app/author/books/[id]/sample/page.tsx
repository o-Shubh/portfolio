import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getOwnBookOr404 } from "@/lib/author-books";
import { sampleLimit, sampleUrl } from "@/lib/book-sample";
import { SampleForm } from "./SampleForm";

export const metadata: Metadata = { title: "Free sample", robots: { index: false } };

export default async function BookSamplePage({ params }: PageProps<"/author/books/[id]/sample">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  const url = sampleUrl(book.sample_path);
  const limit = sampleLimit(book.page_count ?? 24);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl">Free sample</h2>
        <p className="mt-1 text-sm text-muted">
          Let readers try a few pages before they buy. Choose pages from your manuscript; we copy only those pages into a separate PDF. Your full manuscript stays private. The sample shows on your book page and on articles that link to the book{book.status === "published" ? "" : ", once the book is published"}.
        </p>
      </div>
      {!book.manuscript_path ? (
        <p className="card text-sm">
          Upload your manuscript PDF on the{" "}
          <Link href={`/author/books/${id}/files`} className="font-semibold underline">
            Files step
          </Link>{" "}
          first.
        </p>
      ) : (
        <>
          {url && (
            <p className="card flex flex-wrap items-center gap-3 text-sm" data-testid="current-sample">
              <FileText className="h-5 w-5 text-accent-fg" aria-hidden />
              <span>
                Sharing pages {book.sample_from}–{book.sample_to}.
              </span>
              <a href={url} target="_blank" rel="noopener" className="font-semibold underline">
                Open sample
              </a>
            </p>
          )}
          <SampleForm bookId={id} limit={limit} from={book.sample_from} to={book.sample_to} hasSample={Boolean(url)} />
          <p className="text-xs text-muted">
            Tip: skip the title and copyright pages and start where the story starts. If you replace your manuscript, make the sample again.
          </p>
        </>
      )}
    </div>
  );
}
