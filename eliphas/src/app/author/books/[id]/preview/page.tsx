import { FileText, ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { BookCover } from "@/components/BookCover";
import { getOwnBookOr404 } from "@/lib/author-books";
import { coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { isEditable } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { ConfirmFiles } from "./ConfirmFiles";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

export default async function PreviewPage({ params }: PageProps<"/author/books/[id]/preview">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  const { rates } = await getPricingSettings();
  const supabase = await createClient();
  const sign = async (path: string | null) => (path ? ((await supabase.storage.from("manuscripts").createSignedUrl(path, 600)).data?.signedUrl ?? null) : null);
  const [manuscript, printCover, { data: versions }] = await Promise.all([
    sign(book.manuscript_path),
    sign(book.print_cover_path),
    supabase.from("book_file_versions").select("kind, version, path, page_count").eq("book_id", book.id),
  ]);
  const versionOf = (kind: string, path: string | null) => (versions ?? []).find((v) => v.kind === kind && v.path === path)?.version;
  const label = (g: Record<string, { label: string }>, k: string) => g[k]?.label ?? k;
  const ready = Boolean(book.manuscript_path && book.print_cover_path && book.cover_path);

  const files = [
    { key: "manuscript", name: "Inside pages (manuscript PDF)", href: manuscript, version: versionOf("manuscript", book.manuscript_path), detail: book.page_count ? `${book.page_count} pages` : null, icon: FileText },
    { key: "print_cover", name: "Print cover PDF", href: printCover, version: versionOf("print_cover", book.print_cover_path), detail: null, icon: FileText },
    { key: "cover", name: "Front cover image", href: coverUrl(book.cover_path), version: versionOf("cover", book.cover_path), detail: "Shown in the bookstore", icon: ImageIcon },
  ];

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section aria-labelledby="pv-h">
          <h2 id="pv-h" className="text-xl">
            How readers will see it
          </h2>
          <p className="mt-1 text-sm text-muted">A preview of your book page. Nothing is public until our team approves it.</p>
          <div className="editorial mt-4 grid gap-5 rounded-[var(--radius-card)] p-5 ring-1 ring-line sm:grid-cols-[160px_1fr]" lang={book.language}>
            <div className="mx-auto w-36 sm:w-full">
              <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-2xl font-semibold">{book.title || "Untitled"}</p>
              {book.subtitle && <p className="text-muted">{book.subtitle}</p>}
              <p className="mt-1 text-sm" lang="en">
                by <span className="font-medium text-accent-fg">{book.author_name}</span>
              </p>
              <p className="mt-3 text-2xl font-semibold mono" lang="en">
                {book.mrp !== null ? rupees(Number(book.mrp)) : "Price not set"}
              </p>
              {book.description ? <p className="mt-3 line-clamp-6 whitespace-pre-line text-fg/90">{book.description}</p> : <p className="mt-3 text-muted">No description yet.</p>}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm" lang="en">
                <dt className="text-muted">Language</dt>
                <dd>{LANGUAGE_LABEL[book.language]}</dd>
                <dt className="text-muted">Pages</dt>
                <dd className="mono">{book.page_count ?? "—"}</dd>
                <dt className="text-muted">Size</dt>
                <dd>{label(rates.trim_sizes, book.trim_size)}</dd>
                <dt className="text-muted">Binding</dt>
                <dd>{label(rates.binding, book.binding)}</dd>
              </dl>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card" aria-labelledby="files-h">
          <h2 id="files-h" className="text-lg">
            Files you&apos;re submitting
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {files.map((f) => (
              <li key={f.key} className="flex items-start gap-3 py-3">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-muted">{[f.version ? `Version ${f.version}` : null, f.detail].filter(Boolean).join(" · ") || (f.href ? "" : "Not uploaded")}</p>
                  {f.href && (
                    <a href={f.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-accent-fg underline-offset-2 hover:underline">
                      Open and check
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <ConfirmFiles bookId={book.id} confirmed={Boolean(book.files_confirmed_at)} ready={ready} disabled={!isEditable(book)} />
          {book.files_confirmed_at && (
            <p className="mt-3 text-sm text-success" role="status">
              Confirmed {new Date(book.files_confirmed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}. Uploading a file again asks you to confirm again.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
