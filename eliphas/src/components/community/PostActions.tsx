"use client";

import { Bookmark, Flag, Heart, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { setPostBookmark, setPostLike } from "@/app/actions/posts";
import { ReportForm } from "@/components/articles/ReportForm";
import { useClearIntent, useGate } from "@/components/articles/useGate";
import { offlineSafe } from "@/lib/use-form-action";

/** Like (once per account), reply, private save, share and report for one post. */
export function PostActions({ postId, liked, likes, saved, comments, url, intent, showReplyLink = true }: { postId: string; liked: boolean; likes: number; saved: boolean; comments: number; url: string; intent?: string | null; showReplyLink?: boolean }) {
  const gate = useGate();
  const clearIntent = useClearIntent();
  const [like, setLike] = useState({ on: liked, count: likes });
  const [isSaved, setSaved] = useState(saved);
  const [reporting, setReporting] = useState(intent === "report");
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  const toggle = (on: boolean) =>
    start(async () => {
      const res = await offlineSafe(setPostLike(postId, on));
      const msg = gate(res, "like");
      setNote(msg);
      if ("ok" in res) setLike((s) => (s.on === on ? s : { on, count: Math.max(0, s.count + (on ? 1 : -1)) }));
    });

  const toggleSave = (on: boolean) =>
    start(async () => {
      const res = await offlineSafe(setPostBookmark(postId, on));
      const msg = gate(res, "bookmark");
      setNote(msg ?? ("ok" in res ? (on ? "Saved privately." : "Removed from Saved.") : null));
      if ("ok" in res) setSaved(on);
    });

  useEffect(() => {
    if (ran.current || !intent) return;
    ran.current = true;
    if (intent === "like" && !liked) toggle(true);
    if (intent === "bookmark" && !saved) toggleSave(true);
    if (["like", "bookmark", "report"].includes(intent)) clearIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when returning from login
  }, [intent]);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
    } catch {
      setNote(url);
    }
  }

  const btn = "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-60";
  return (
    <div>
      <div className="-mx-3 flex flex-wrap items-center">
        <button type="button" className={`${btn} ${like.on ? "text-fg" : ""}`} aria-pressed={like.on} onClick={() => toggle(!like.on)} disabled={pending} data-testid="post-like">
          <Heart className={`h-4 w-4 ${like.on ? "fill-current text-danger" : ""}`} aria-hidden />
          <span className="mono">{like.count}</span>
          <span className="sr-only">{like.on ? "Liked. Unlike" : "Like"}</span>
        </button>
        {showReplyLink && (
          <Link href={`/community/${postId}#comments`} className={btn}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            <span className="mono">{comments}</span>
            <span className="sr-only">{comments === 1 ? "reply" : "replies"}</span>
          </Link>
        )}
        <button type="button" className={`${btn} ${isSaved ? "text-fg" : ""}`} aria-pressed={isSaved} onClick={() => toggleSave(!isSaved)} disabled={pending} data-testid="post-save">
          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} aria-hidden /> <span className="sr-only sm:not-sr-only">{isSaved ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className={btn} onClick={share}>
          <Share2 className="h-4 w-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Share</span>
        </button>
        <button type="button" className={`${btn} ml-auto`} onClick={() => setReporting((r) => !r)} aria-expanded={reporting}>
          <Flag className="h-4 w-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Report</span>
        </button>
      </div>
      <p aria-live="polite" className="min-h-0 text-sm text-muted">
        {note}
      </p>
      {reporting && <ReportForm targetType="post" targetId={postId} intent="report" onDone={() => setReporting(false)} />}
    </div>
  );
}
