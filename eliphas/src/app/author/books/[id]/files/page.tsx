import type { Metadata } from "next";
import Link from "next/link";
import { getOwnBookOr404 } from "@/lib/author-books";
import { coverUrl } from "@/lib/books";
import { isEditable, pageSizeMatches } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { FileUploader } from "./FileUploader";

export const metadata: Metadata = { title: "Manuscript and cover" };

export default async function FilesPage({ params }: PageProps<"/author/books/[id]/files">) {
  const { id } = await params;
  const { profile, book } = await getOwnBookOr404(id);
  const { rates } = await getPricingSettings();
  const disabled = !isEditable(book);

  // Short-lived private link so the author can check their uploaded PDF
  let manuscriptLink: string | null = null;
  if (book.manuscript_path) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("manuscripts").createSignedUrl(book.manuscript_path, 600);
    manuscriptLink = data?.signedUrl ?? null;
  }

  const trim = rates.trim_sizes[book.trim_size];
  const sizeWarning =
    book.manuscript_width_in && book.manuscript_height_in && trim
      ? !pageSizeMatches(Number(book.manuscript_width_in), Number(book.manuscript_height_in), trim)
      : false;
  const version = new Date(book.updated_at).getTime();

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <section className="card">
        <h2 className="text-xl font-semibold">Manuscript</h2>
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
        {sizeWarning && trim && (
          <p role="note" className="mt-4 rounded-xl border border-marigold/60 bg-marigold/10 p-3 text-sm">
            Your PDF pages are {book.manuscript_width_in} × {book.manuscript_height_in} in, but the book size is{" "}
            <strong>{trim.label}</strong>. Change the size on the{" "}
            <Link className="font-semibold underline" href={`/author/books/${book.id}/print`}>
              Print & price
            </Link>{" "}
            step, or export your PDF at the right size.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="text-xl font-semibold">Cover</h2>
        <p className="mt-1 text-sm text-muted">
          Front cover as JPG or PNG (at least 1600 px tall), or a print-ready PDF. Up to 10 MB. The image is also shown in
          the bookstore.
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
                  preview: book.cover_path.endsWith(".pdf") ? undefined : `${coverUrl(book.cover_path)}?v=${version}`,
                }
              : null
          }
        />
      </section>

      {!disabled && (
        <div className="md:col-span-2">
          <Link href={`/author/books/${book.id}/print`} className="btn-accent">
            Continue to print & price
          </Link>
        </div>
      )}
    </div>
  );
}
