"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminUnpublish, approveBook, sendBack, type ActionState } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import type { BookStatus } from "@/lib/publishing";

export function ReviewActions({
  bookId,
  status,
  slug,
  lastNote,
}: {
  bookId: string;
  status: BookStatus;
  slug: string;
  lastNote: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>();
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      setMsg(undefined);
      const res = await fn();
      setMsg(res);
      if (!res?.error) {
        setNote("");
        router.refresh();
      }
    });

  if (status === "in_review") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg">Decision</h2>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Approve and publish this book? It gets its permanent Eliphas Edition ID now (or keeps the one it has).")) run(() => approveBook(bookId));
          }}
        >
          Approve and publish
        </button>
        <div className="border-t border-line pt-4">
          <label htmlFor="note" className="label">
            Or send back with a note
          </label>
          <textarea
            id="note"
            rows={5}
            className="field py-3"
            placeholder="What should the author fix? E.g. 'Inside margins are less than 0.5 in on pages 12–20.'"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost mt-3 w-full"
            disabled={pending || note.trim().length < 10}
            onClick={() => run(() => sendBack(bookId, note))}
          >
            Send back to author
          </button>
        </div>
        <FormMessage state={msg} />
      </div>
    );
  }

  if (status === "published") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg">Live in the bookstore</h2>
        <Link href={`/books/${slug}`} className="btn-ghost w-full">
          View book page
        </Link>
        <label htmlFor="note" className="label">
          Reason (shown to the author)
        </label>
        <textarea id="note" rows={3} className="field py-3" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          className="min-h-11 w-full text-sm font-semibold text-danger underline"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Hide this book from the bookstore?")) run(() => adminUnpublish(bookId, note));
          }}
        >
          Unpublish
        </button>
        <FormMessage state={msg} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg">Nothing to decide</h2>
      <p className="text-muted">
        {status === "changes_requested"
          ? "Waiting for the author to make changes and resubmit."
          : status === "draft"
            ? "The author hasn't submitted this book yet."
            : "This book is unpublished."}
      </p>
      {lastNote && (
        <p className="rounded-[var(--radius-card)] bg-surface-2 p-3 text-sm">
          <span className="font-semibold">Last note:</span> {lastNote}
        </p>
      )}
      <FormMessage state={msg} />
    </div>
  );
}
