"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setBlock } from "@/app/actions/community";
import { addPostComment, deletePostComment, editPostComment } from "@/app/actions/posts";
import { ReportForm } from "@/components/articles/ReportForm";
import { useClearIntent, useGate } from "@/components/articles/useGate";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { offlineSafe } from "@/lib/use-form-action";

export type ThreadComment = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  user_id: string;
  parent_id: string | null;
  name: string;
  avatar: string | null;
  profile: string | null;
  verified: boolean;
  mine: boolean;
};

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Comments and replies (two levels). Anyone can read; taking part needs a login. */
export function PostComments({
  postId,
  comments,
  totalTop,
  page,
  pageSize,
  signedIn,
  canComment,
  intent,
}: {
  postId: string;
  comments: ThreadComment[];
  totalTop: number;
  page: number;
  pageSize: number;
  signedIn: boolean;
  canComment: boolean;
  intent?: string | null;
}) {
  const top = comments.filter((c) => !c.parent_id);
  const pages = Math.max(1, Math.ceil(totalTop / pageSize));
  return (
    <section id="comments" aria-labelledby="comments-h" className="scroll-mt-24">
      <h2 id="comments-h" className="text-xl">
        Comments <span className="text-muted tabular-nums">({comments.length})</span>
      </h2>
      {canComment ? (
        <Composer postId={postId} parentId={null} signedIn={signedIn} intent={intent} />
      ) : (
        <p className="mt-3 text-sm text-muted">Comments are closed for you on this post.</p>
      )}
      {top.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line">
          {top.map((c) => (
            <li key={c.id} id={`c-${c.id}`} className="scroll-mt-24 py-4">
              <Comment c={c} signedIn={signedIn} />
              <Replies postId={postId} parent={c} replies={comments.filter((r) => r.parent_id === c.id)} signedIn={signedIn} canComment={canComment} />
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Comment pages" className="mt-4 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={`?cpage=${page - 1}#comments`} scroll={false}>
              Earlier comments
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={`?cpage=${page + 1}#comments`} scroll={false}>
              More comments
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

function Replies({ postId, parent, replies, signedIn, canComment }: { postId: string; parent: ThreadComment; replies: ThreadComment[]; signedIn: boolean; canComment: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 ml-10">
      {replies.length > 0 && (
        <ul className="space-y-3 border-l-2 border-line pl-4" aria-label={`Replies to ${parent.name}`}>
          {replies.map((r) => (
            <li key={r.id} id={`c-${r.id}`} className="scroll-mt-24">
              <Comment c={r} signedIn={signedIn} small />
            </li>
          ))}
        </ul>
      )}
      {canComment &&
        (open ? (
          <div className="mt-2">
            <Composer postId={postId} parentId={parent.id} signedIn={signedIn} onDone={() => setOpen(false)} autoFocus label={`Reply to ${parent.name}`} />
          </div>
        ) : (
          <button type="button" className="min-h-11 text-sm font-semibold text-accent-fg" onClick={() => setOpen(true)}>
            Reply
          </button>
        ))}
    </div>
  );
}

function Composer({ postId, parentId, signedIn, intent, onDone, autoFocus = false, label = "Add a comment" }: { postId: string; parentId: string | null; signedIn: boolean; intent?: string | null; onDone?: () => void; autoFocus?: boolean; label?: string }) {
  const router = useRouter();
  const gate = useGate();
  const clearIntent = useClearIntent();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const ran = useRef(false);
  const id = `comment-${parentId ?? "new"}`;

  useEffect(() => {
    if (parentId || intent !== "comment" || ran.current) return;
    ran.current = true;
    box.current?.scrollIntoView({ block: "center" });
    box.current?.focus();
    clearIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when returning from login
  }, [intent]);

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return setError("Write something first.");
        start(async () => {
          const res = await offlineSafe(addPostComment(postId, text, parentId));
          setError(gate(res, "comment"));
          if ("ok" in res) {
            setText("");
            onDone?.();
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={box}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => {
          if (!signedIn) gate({ error: "", login: true }, "comment");
        }}
        maxLength={2000}
        rows={parentId ? 2 : 3}
        placeholder={signedIn ? (parentId ? "Write a reply" : "Share your view") : "Log in to join the conversation"}
        className="field py-2.5"
        data-testid={parentId ? "reply-box" : "comment-box"}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary min-h-10" disabled={pending}>
          {pending ? "Posting…" : parentId ? "Post reply" : "Post comment"}
        </button>
        {onDone && (
          <button type="button" className="btn-quiet min-h-10" onClick={onDone}>
            Cancel
          </button>
        )}
        {!parentId && (
          <span className="text-xs text-muted">
            Be kind. Comments are public and can be reported.{" "}
            <Link href="/community-guidelines" className="underline underline-offset-2 hover:text-fg">
              Guidelines
            </Link>
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function Comment({ c, signedIn, small = false }: { c: ThreadComment; signedIn: boolean; small?: boolean }) {
  const router = useRouter();
  const gate = useGate();
  const [mode, setMode] = useState<null | "edit" | "delete" | "report" | "block">(null);
  const [text, setText] = useState(c.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<Parameters<typeof gate>[0]>) =>
    start(async () => {
      const res = await offlineSafe(fn());
      setError(gate(res, "comment"));
      if ("ok" in res) {
        setMode(null);
        router.refresh();
      }
    });
  const link = "min-h-9 text-xs font-semibold text-muted underline-offset-2 hover:text-fg hover:underline";

  return (
    <div data-testid="comment">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <AuthorAvatar name={c.name} path={c.avatar} size="sm" />
        {c.profile ? (
          <Link href={c.profile} className="font-semibold hover:underline">
            {c.name}
          </Link>
        ) : (
          <span className="font-semibold">{c.name}</span>
        )}
        {c.verified && <VerifiedBadge compact />}
        <span className="text-muted">
          · <time dateTime={c.created_at}>{when(c.created_at)}</time>
          {c.edited_at && " · edited"}
        </span>
      </p>
      {mode === "edit" ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => editPostComment(c.id, text));
          }}
        >
          <label htmlFor={`edit-${c.id}`} className="sr-only">
            Edit your comment
          </label>
          <textarea id={`edit-${c.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} className="field py-2.5" />
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
        <p className={`mt-1 break-words whitespace-pre-line ${small ? "text-[0.9375rem]" : ""}`}>{c.body}</p>
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
        <div role="alertdialog" aria-label="Delete comment" className="mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm">
          Delete this comment{small ? "" : " and its replies"} for good?
          <button type="button" className="btn-primary min-h-9" disabled={pending} onClick={() => act(() => deletePostComment(c.id))}>
            Delete
          </button>
          <button type="button" className="btn-ghost min-h-9" onClick={() => setMode(null)}>
            Keep it
          </button>
        </div>
      )}
      {mode === "block" && (
        <div role="alertdialog" aria-label={`Block ${c.name}`} className="mt-2 space-y-2 rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm">
          <p>
            Block {c.name}? You won&apos;t see their comments or posts, they can&apos;t comment on your posts or follow you, and follows between you end. Public pages stay visible to logged-out visitors. You can unblock from Notifications.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary min-h-9" disabled={pending} onClick={() => act(() => setBlock(c.user_id, true))}>
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
          <ReportForm targetType="post_comment" targetId={c.id} intent="comment" onDone={() => setMode(null)} />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
