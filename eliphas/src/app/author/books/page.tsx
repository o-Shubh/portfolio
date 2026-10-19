import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listOwnBooks } from "@/lib/author-books";
import { coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { rupees } from "@/lib/pricing";

export const metadata: Metadata = { title: "My books" };

const updated = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function MyBooksPage() {
  const books = await listOwnBooks();

  return (
    <>
      <PageHeader
        title="My books"
        intro={books.length ? `${books.length} ${books.length === 1 ? "book" : "books"}. Open one to edit its details, files, price and sample.` : undefined}
        action={
          <Link href="/author/books/new" className="btn-primary">
            <Plus className="h-5 w-5" aria-hidden /> New book
          </Link>
        }
      />
      {books.length === 0 ? (
        <div className="card text-center">
          <p className="text-xl font-semibold">Let&apos;s publish your first book</p>
          <p className="mt-1 text-muted">Keep your manuscript PDF and cover ready. You can save and come back any time.</p>
          <Link href="/author/books/new" className="btn-primary mt-5">
            Start a new book
          </Link>
        </div>
      ) : (
        <ul className="group-list">
          {books.map((b) => {
            const next =
              b.status === "draft"
                ? "Continue setting up"
                : b.status === "changes_requested"
                  ? "Read the note from our team"
                  : b.status === "published" && !b.sample_path
                    ? "Add a free sample"
                    : null;
            return (
              <li key={b.id}>
                <Link href={`/author/books/${b.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2 md:px-5">
                  <div className="w-12 shrink-0">
                    <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" lang={b.language}>
                      {b.title}
                    </p>
                    <p className="text-sm text-muted">
                      {LANGUAGE_LABEL[b.language]}
                      {b.mrp !== null && <> · {rupees(Number(b.mrp))}</>} · Updated {updated(b.updated_at)}
                    </p>
                    {next && <p className="mt-0.5 text-sm font-medium text-accent-fg">{next}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={b.status} />
                    <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
