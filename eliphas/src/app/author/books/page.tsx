import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listOwnBooks } from "@/lib/author-books";
import { coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { rupees } from "@/lib/pricing";

export const metadata: Metadata = { title: "My books" };

export default async function MyBooksPage() {
  const books = await listOwnBooks();

  return (
    <>
      <PageHeader
        title="My books"
        action={
          <Link href="/author/books/new" className="btn-primary">
            <Plus className="h-5 w-5" aria-hidden /> New book
          </Link>
        }
      />
      {books.length === 0 ? (
        <div className="card text-center">
          <p className="font-heading text-2xl">Let&apos;s publish your first book</p>
          <p className="mt-1 text-muted">Keep your manuscript PDF and cover ready. You can save and come back any time.</p>
          <Link href="/author/books/new" className="btn-primary mt-5">
            Start a new book
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {books.map((b) => (
            <li key={b.id}>
              <Link
                href={`/author/books/${b.id}`}
                className="card flex items-center gap-4 p-3 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="w-14 shrink-0">
                  <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size="xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.title}</p>
                  <p className="text-sm text-muted">
                    {LANGUAGE_LABEL[b.language]}
                    {b.mrp !== null && <> · {rupees(Number(b.mrp))}</>}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
