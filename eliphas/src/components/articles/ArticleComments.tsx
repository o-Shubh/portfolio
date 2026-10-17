"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addComment, deleteComment, editComment, setBlock } from "@/app/actions/community";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { ReportForm } from "./ReportForm";
import { useClearIntent, useGate } from "./useGate";
import { offlineSafe } from "@/lib/use-form-action";

export type PublicComment = { id: string; body: string; created_at: string; edited_at: string | null; user_id: string; name: string; avatar: string | null; mine: boolean };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Flat comments: anyone can read; posting needs a login. Edit or delete your own; report or block others. */
export function ArticleComments({ articleId, comments, signedIn, canComment, intent }: { articleId: string; comments: PublicComment[]; signedIn: boolean; canComment: boolean; intent?: string | null }) {
  const router = useRouter();
  const gate = useGate();
  const clearIntent = useClearIntent();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (intent !== "comment" || ran.current) return;
    ran.current = true;
    box.current?.scrollIntoView({ block: "center" });
    box.current?.focus();
    clearIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when returning from login
  }, [intent]);

  return (
    <section id="comments" aria-labelledby="comments-h" className="scroll-mt-24">
      <h2 id="comments-h" className="text-xl">
        Comments <span className="text-muted tabular-nums">({comments.length})</span>
      </h2>

      {canComment ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return setError("Write a comment first.");
            start(async () => {
              const res = await offlineSafe(addComment(articleId, text));
              const msg = gate(res, "comment");
              setError(msg);
              if ("ok" in res) {
                setText("");
                router.refresh();
              }
            });
          }}
        >
          <label htmlFor="new-comment" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="new-comment"
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => {
              if (!signedIn) gate({ error: "", login: true }, "comment");
            }}
            maxLength={2000}
            rows={3}
            placeholder={signedIn ? "Share a thought about this article" : "Log in to comment"}
            className="field"
          />
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary min-h-10" disabled={pending}>
              {pending ? "Posting…" : "Post comment"}
            </button>
            <span className="text-xs text-muted">Be kind. Comments are public and can be reported.</span>
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">Comments are closed for you on this article.</p>
      )}

      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {comments.map((c) => (
            <Comment key={c.id} c={c} signedIn={signedIn} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Comment({ c, signedIn }: { c: PublicComment; signedIn: boolean }) {
  const router = useRouter();
  const gate = useGate();
  const [mode, setMode] = useState<null | "edit" | "delete" | "report" | "block">(null);
  const [text, setText] = useState(c.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<Parameters<typeof gate>[0]>, intent: string) =>
    start(async () => {
      const res = await offlineSafe(fn());
      const msg = gate(res, intent);
      setError(msg);
      if ("ok" in res) {
        setMode(null);
        router.refresh();
      }
    });

  const link = "min-h-9 text-xs font-semibold text-muted underline-offset-2 hover:text-fg hover:underline";

  return (
    <li className="py-4" data-testid="comment">
      <p className="flex items-center gap-2 text-sm">
        <AuthorAvatar name={c.name} path={c.avatar} size="sm" />
        <span className="font-semibold">{c.name}</span>
        <span className="text-muted">
          {" · "}
          <time dateTime={c.created_at}>{when(c.created_at)}</time>
          {c.edited_at && " · edited"}
        </span>
      </p>
      {mode === "edit" ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => editComment(c.id, text), "comment");
          }}
        >
          <label htmlFor={`edit-${c.id}`} className="sr-only">
            Edit your comment
          </label>
          <textarea id={`edit-${c.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} className="field" />
          <div className="flex gap-2">
            <button className="btn-primary min-h-10" disabled={pending}>
              Save
            </button>
            <button type="button" className="btn-ghost min-h-10" onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-1 whitespace-pre-line break-words">{c.body}</p>
      )}

      {mode !== "edit" && (
        <div className="mt-1 flex flex-wrap gap-4">
          {c.mine ? (
            <>
              <button type="button" className={link} onClick={() => setMode("edit")}>
                Edit
              </button>
              <button type="button" className={link} onClick={() => setMode("delete")}>
                Delete
              </button>
            </>
          ) : (
            signedIn && (
              <>
                <button type="button" className={link} onClick={() => setMode(mode === "report" ? null : "report")}>
                  Report
                </button>
                <button type="button" className={link} onClick={() => setMode("block")}>
                  Block {c.name}
                </button>
              </>
            )
          )}
        </div>
      )}

      {mode === "delete" && (
        <div role="alertdialog" aria-label="Delete comment" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3 text-sm">
          Delete this comment for good?
          <button type="button" className="btn-primary min-h-9" disabled={pending} onClick={() => act(() => deleteComment(c.id), "comment")}>
            Delete
          </button>
          <button type="button" className="btn-ghost min-h-9" onClick={() => setMode(null)}>
            Keep it
          </button>
        </div>
      )}
      {mode === "block" && (
        <div role="alertdialog" aria-label={`Block ${c.name}`} className="mt-2 space-y-2 rounded-lg bg-surface-2 p-3 text-sm">
          <p>
            Block {c.name}? You won&apos;t see their comments, they can&apos;t comment on your articles or follow you, and any follows between you end. You can unblock them from your Notifications page.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary min-h-9" disabled={pending} onClick={() => act(() => setBlock(c.user_id, true), "comment")}>
              Block
            </button>
            <button type="button" className="btn-ghost min-h-9" onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {mode === "report" && (
        <div className="mt-2">
          <ReportForm targetType="comment" targetId={c.id} intent="comment" onDone={() => setMode(null)} />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
