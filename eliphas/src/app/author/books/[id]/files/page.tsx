import type { Metadata } from "next";
import Link from "next/link";
import { getOwnBookOr404 } from "@/lib/author-books";
import { coverUrl } from "@/lib/books";
import { coverSizeMatches, fullCoverSize, isEditable, pageSizeMatches } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { FileUploader } from "./FileUploader";

export const metadata: Metadata = { title: "Manuscript and cover" };

export default async function FilesPage({ params }: PageProps<"/author/books/[id]/files">) {
  const { id } = await params;
  const { profile, book } = await getOwnBookOr404(id);
  const { rates } = await getPricingSettings();
  const disabled = !isEditable(book);

  // Short-lived private links so the author can check their uploaded PDFs
  const supabase = await createClient();
  const signed = async (path: string | null) =>
    path ? ((await supabase.storage.from("manuscripts").createSignedUrl(path, 600)).data?.signedUrl ?? null) : null;
  const [manuscriptLink, printCoverLink] = await Promise.all([signed(book.manuscript_path), signed(book.print_cover_path)]);

  const trim = rates.trim_sizes[book.trim_size];
  const pageWarning =
    book.manuscript_width_in && book.manuscript_height_in && trim
      ? !pageSizeMatches(Number(book.manuscript_width_in), Number(book.manuscript_height_in), trim)
      : false;
  const expected = fullCoverSize(book, rates);
  const coverWarning =
    expected && book.print_cover_width_in && book.print_cover_height_in
      ? !coverSizeMatches(Number(book.print_cover_width_in), Number(book.print_cover_height_in), expected)
      : false;
  const version = new Date(book.updated_at).getTime();
  const printLink = (
    <Link className="font-semibold underline" href={`/author/books/${book.id}/print`}>
      Print & price
    </Link>
  );

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-3">
      <section className="card">
        <h2 className="text-xl font-semibold">1. Manuscript</h2>
        <p className="mt-1 text-sm text-muted">
          The inside pages as one print-ready PDF. Embed all fonts (needed for Hindi). Up to 50 MB.
        </p>
        <FileUploader
          kind="manuscript"
          bookId={book.id}
          authorId={profile.id}
          disabled={disabled}
          current={
            book.manuscript_path
              ? {
                  name: "manuscript.pdf",
                  href: manuscriptLink,
                  detail: [
                    book.page_count && `${book.page_count} pages`,
                    book.manuscript_width_in && `${book.manuscript_width_in} × ${book.manuscript_height_in} in`,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                }
              : null
          }
        />
        {pageWarning && trim && (
          <p role="note" className="mt-4 rounded-2xl bg-marigold/10 ring-1 ring-marigold/30 p-3 text-sm">
            Your PDF pages are {book.manuscript_width_in} × {book.manuscript_height_in} in, but the book size is{" "}
            <strong>{trim.label}</strong>. Change the size on the {printLink} step, or export your PDF at the right size.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">2. Front cover image</h2>
        <p className="mt-1 text-sm text-muted">
          Shown in the bookstore. JPG, PNG or WebP, at least 1600 px tall, up to 10 MB.
        </p>
        <FileUploader
          kind="cover"
          bookId={book.id}
          authorId={profile.id}
          disabled={disabled}
          current={
            book.cover_path
              ? {
                  name: book.cover_path.split("/").pop()!,
                  href: `${coverUrl(book.cover_path)}?v=${version}`,
                  preview: `${coverUrl(book.cover_path)}?v=${version}`,
                }
              : null
          }
        />
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">3. Print cover PDF</h2>
        <p className="mt-1 text-sm text-muted">
          The full cover the printer uses: back, spine and front in one PDF, with bleed. Up to 10 MB.
        </p>
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
          {expected ? (
            <>
              <p className="font-semibold">
                Make it {expected.widthIn} × {expected.heightIn} in
              </p>
              <p className="text-muted">
                Spine {expected.spineMm} mm for {book.page_count} pages. Includes {rates.cover_bleed_in ?? 0.125} in bleed on
                every side.
                {book.binding === "hardcover" && " Hardcover covers need extra wrap: we'll confirm the size during review."}
              </p>
            </>
          ) : (
            <p className="text-muted">Upload the manuscript (or enter pages on {printLink}) to see the exact size.</p>
          )}
        </div>
        <FileUploader
          kind="print_cover"
          bookId={book.id}
          authorId={profile.id}
          disabled={disabled}
          current={
            book.print_cover_path
              ? {
                  name: "print-cover.pdf",
                  href: printCoverLink,
                  detail: book.print_cover_width_in
                    ? `${book.print_cover_width_in} × ${book.print_cover_height_in} in`
                    : undefined,
                }
              : null
          }
        />
        {coverWarning && expected && (
          <p role="note" className="mt-4 rounded-2xl bg-marigold/10 ring-1 ring-marigold/30 p-3 text-sm">
            This PDF is {book.print_cover_width_in} × {book.print_cover_height_in} in, but it should be {expected.widthIn} ×{" "}
            {expected.heightIn} in. Please re-export it at that size.
          </p>
        )}
      </section>

      {!disabled && (
        <div className="lg:col-span-3">
          <Link href={`/author/books/${book.id}/print`} className="btn-accent">
            Continue to print & price
          </Link>
        </div>
      )}
    </div>
  );
}
