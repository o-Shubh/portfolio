"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteDraft,
  submitForReview,
  unpublishBook,
  withdrawFromReview,
  type ActionState,
} from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import type { BookStatus } from "@/lib/publishing";

export function SubmitActions({
  bookId,
  status,
  ready,
  slug,
}: {
  bookId: string;
  status: BookStatus;
  ready: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>();

  const run = (fn: (id: string) => Promise<ActionState>, confirmText?: string) => () => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMsg(undefined);
    start(async () => {
      const res = await fn(bookId);
      setMsg(res);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {(status === "draft" || status === "changes_requested" || status === "unpublished") && (
        <>
          <h2 className="text-xl font-semibold">{status === "draft" ? "Send for review" : "Send for review again"}</h2>
          <p className="text-muted">
            Our team checks your files for print quality. Editing is locked while we review. You&apos;ll see the result
            here.
          </p>
          <button type="button" className="btn-accent" disabled={!ready || pending} onClick={run(submitForReview)}>
            {pending ? "Sending…" : "Send for review"}
          </button>
          {!ready && <p className="text-sm text-muted">Finish the checklist first.</p>}
        </>
      )}

      {status === "in_review" && (
        <>
          <h2 className="text-xl font-semibold">Waiting for review</h2>
          <p className="text-muted">Need to change something? Withdraw it, edit, and send it again.</p>
          <button type="button" className="btn-ghost" disabled={pending} onClick={run(withdrawFromReview)}>
            Withdraw from review
          </button>
        </>
      )}

      {status === "published" && (
        <>
          <h2 className="text-xl font-semibold">Your book is live</h2>
          <Link href={`/books/${slug}`} className="btn-accent">
            View in bookstore
          </Link>
          <p className="text-muted">To make changes, unpublish it first. It will be hidden until approved again.</p>
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={run(unpublishBook, "Hide this book from the bookstore? Readers won't be able to order it.")}
          >
            Unpublish
          </button>
        </>
      )}

      <FormMessage state={msg} />

      {status === "draft" && (
        <div className="border-t border-line pt-4">
          <button
            type="button"
            className="text-sm font-semibold text-danger underline"
            disabled={pending}
            onClick={run(deleteDraft, "Delete this draft and its files? This can't be undone.")}
          >
            Delete draft
          </button>
        </div>
      )}
    </div>
  );
}
