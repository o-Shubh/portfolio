import { ArrowLeft, Lock, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { getOwnBookOr404 } from "@/lib/author-books";
import { isEditable, STATUS } from "@/lib/publishing";
import { BookSteps } from "./BookSteps";

export default async function BookEditorLayout({ children, params }: LayoutProps<"/author/books/[id]">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);

  return (
    <>
      <Link href="/author/books" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My books
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold md:text-3xl" lang={book.language}>
          {book.title}
        </h1>
        <StatusBadge status={book.status} />
      </div>
      <p className="mt-1 text-sm text-muted">{STATUS[book.status].help}</p>

      {book.status === "changes_requested" && book.review_note && (
        <div role="note" className="mt-4 flex gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4">
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-semibold">Note from our review team</p>
            <p className="mt-1 whitespace-pre-line">{book.review_note}</p>
          </div>
        </div>
      )}
      {!isEditable(book) && (
        <div role="note" className="mt-4 flex gap-3 rounded-xl border border-line bg-surface-2 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            {book.status === "in_review"
              ? "Editing is locked while we review. To make changes, withdraw it from review on the Submit step."
              : "Editing is locked while the book is live. To make changes, unpublish it on the Submit step, edit, and send it for review again."}
          </p>
        </div>
      )}

      <BookSteps bookId={book.id} />
      <div className="mt-6">{children}</div>
    </>
  );
}
