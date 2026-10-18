import type { Metadata } from "next";
import Link from "next/link";
import { getOwnBookOr404 } from "@/lib/author-books";
import { coverUrl } from "@/lib/books";
import { coverSizeMatches, fullCoverSize, isEditable, pageSizeMatches } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { BookServicesCard } from "@/components/BookServicesCard";
import { FileUploader } from "./FileUploader";

export const metadata: Metadata = { title: "Manuscript and cover" };

export default async function FilesPage({ params }: PageProps<"/author/books/[id]/files">) {
  const { id } = await params;
  const { profile, book } = await getOwnBookOr404(id);
  const { rates } = await getPricingSettings();
  const disabled = !isEditable(book);
  const liveRevision = book.status === "published" && !book.removed_at;

  // Short-lived private links so the author can check their uploaded PDFs
  const supabase = await createClient();
  const signed = async (path: string | null) =>
    path ? ((await supabase.storage.from("manuscripts").createSignedUrl(path, 600)).data?.signedUrl ?? null) : null;
  const [manuscriptLink, printCoverLink, { data: versions }] = await Promise.all([
    signed(book.manuscript_path),
    signed(book.print_cover_path),
    supabase.from("book_file_versions").select("id, kind, version, page_count, created_at, path").eq("book_id", book.id).order("version", { ascending: false }),
  ]);
  const approved = (book.approved_files ?? {}) as Record<string, { id?: string | null } | null>;

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
        <h2 className="text-xl">1. Manuscript</h2>
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
          <p role="note" className="mt-4 rounded-[var(--radius-card)] bg-accent/10 ring-1 ring-accent/30 p-3 text-sm">
            Your PDF pages are {book.manuscript_width_in} × {book.manuscript_height_in} in, but the book size is{" "}
            <strong>{trim.label}</strong>. Change the size on the {printLink} step, or export your PDF at the right size.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="text-xl">2. Front cover image</h2>
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
        <h2 className="text-xl">3. Print cover PDF</h2>
        <p className="mt-1 text-sm text-muted">
          The full cover the printer uses: back, spine and front in one PDF, with bleed. Up to 10 MB.
        </p>
        <div className="mt-3 rounded-[var(--radius-card)] bg-surface-2 p-3 text-sm">
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
        {liveRevision && (
          <p role="note" className="mb-3 rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm" data-testid="live-revision-note">
            {book.print_review_requested_at
              ? "Your revised print cover is waiting for our print review. Orders keep using the approved cover until it's approved."
              : "Your book is live. You can upload a revised print cover (for example with your Edition ID QR label). It's saved as a new version and checked by our team before printing; the approved cover stays in use until then."}
          </p>
        )}
        <FileUploader
          kind="print_cover"
          bookId={book.id}
          authorId={profile.id}
          disabled={disabled && !liveRevision}
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
          <p role="note" className="mt-4 rounded-[var(--radius-card)] bg-accent/10 ring-1 ring-accent/30 p-3 text-sm">
            This PDF is {book.print_cover_width_in} × {book.print_cover_height_in} in, but it should be {expected.widthIn} ×{" "}
            {expected.heightIn} in. Please re-export it at that size.
          </p>
        )}
      </section>

      {(versions ?? []).length > 0 && (
        <section className="card lg:col-span-3" aria-labelledby="versions-h">
          <h2 id="versions-h" className="text-lg">
            File versions
          </h2>
          <p className="mt-1 text-sm text-muted">Every upload is kept. Our team approves specific versions, and printers only receive the approved ones.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">File</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Version</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Uploaded</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(versions ?? []).map((v) => {
                  const current = v.path === (v.kind === "manuscript" ? book.manuscript_path : v.kind === "print_cover" ? book.print_cover_path : book.cover_path);
                  return (
                    <tr key={v.id}>
                      <td className="py-2 pr-4">{v.kind === "manuscript" ? "Manuscript" : v.kind === "print_cover" ? "Print cover" : "Front cover image"}</td>
                      <td className="py-2 pr-4 mono">
                        v{v.version}
                        {v.page_count ? ` · ${v.page_count} pages` : ""}
                      </td>
                      <td className="py-2 pr-4 mono">{new Date(v.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</td>
                      <td className="py-2">
                        {approved[v.kind]?.id === v.id ? <span className="badge bg-success/15 text-success">Approved</span> : current ? <span className="badge bg-surface-2">Current</span> : <span className="text-muted">Earlier</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="lg:col-span-3">
        <BookServicesCard bookId={book.id} authorId={book.author_id} />
      </div>

      {!disabled && (
        <div className="lg:col-span-3">
          <Link href={`/author/books/${book.id}/print`} className="btn-primary">
            Continue to pricing
          </Link>
        </div>
      )}
    </div>
  );
}
