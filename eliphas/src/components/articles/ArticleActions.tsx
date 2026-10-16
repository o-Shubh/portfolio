"use client";

import { Bookmark, Flag, Heart, Share2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { setBookmark, setLike } from "@/app/actions/community";
import { ReportForm } from "./ReportForm";
import { useClearIntent, useGate } from "./useGate";

/** Like, save, share and report for one article. Likes are once per account; saves are private. */
export function ArticleActions({
  articleId,
  title,
  url,
  liked,
  likes,
  saved,
  intent,
}: {
  articleId: string;
  title: string;
  url: string;
  liked: boolean;
  likes: number;
  saved: boolean;
  intent?: string | null;
}) {
  const gate = useGate();
  const clearIntent = useClearIntent();
  const [like, setLikeState] = useState({ on: liked, count: likes });
  const [isSaved, setSaved] = useState(saved);
  const [reporting, setReporting] = useState(intent === "report");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  const toggleLike = (on: boolean) =>
    start(async () => {
      const res = await setLike(articleId, on);
      setError(gate(res, "like"));
      if ("ok" in res) setLikeState((s) => (s.on === on ? s : { on, count: Math.max(0, s.count + (on ? 1 : -1)) }));
    });
  const toggleSave = (on: boolean) =>
    start(async () => {
      const res = await setBookmark(articleId, on);
      setError(gate(res, "bookmark"));
      if ("ok" in res) {
        setSaved(on);
        setNote(on ? "Saved to your Saved articles." : "Removed from Saved articles.");
      }
    });

  useEffect(() => {
    if (ran.current || !intent) return;
    ran.current = true;
    if (intent === "like" && !liked) toggleLike(true);
    else if (intent === "bookmark" && !saved) toggleSave(true);
    if (["like", "bookmark", "report"].includes(intent)) clearIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when returning from login
  }, [intent]);

  async function share() {
    setError(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // cancelled, or not allowed here: fall back to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
    } catch {
      setNote(url);
    }
  }

  const btn = "inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium transition hover:border-gold disabled:opacity-60";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`${btn} ${like.on ? "border-gold bg-gold/15" : ""}`} aria-pressed={like.on} onClick={() => toggleLike(!like.on)} disabled={pending} data-testid="like">
          <Heart className={`h-4 w-4 ${like.on ? "fill-current text-[#b4412f]" : ""}`} aria-hidden />
          {like.on ? "Liked" : "Like"}
          <span className="tabular-nums text-muted" aria-label={`${like.count} ${like.count === 1 ? "like" : "likes"}`}>
            {like.count}
          </span>
        </button>
        <button type="button" className={`${btn} ${isSaved ? "border-gold bg-gold/15" : ""}`} aria-pressed={isSaved} onClick={() => toggleSave(!isSaved)} disabled={pending} data-testid="bookmark">
          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} aria-hidden />
          {isSaved ? "Saved" : "Save"}
        </button>
        <button type="button" className={btn} onClick={share}>
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </button>
        <button type="button" className={`${btn} ml-auto border-transparent text-muted`} onClick={() => setReporting((r) => !r)} aria-expanded={reporting} data-testid="report-article">
          <Flag className="h-4 w-4" aria-hidden /> Report
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-muted">
        {error ? <span className="font-medium text-danger">{error}</span> : note}
      </p>
      {reporting && <ReportForm targetType="article" targetId={articleId} intent="report" onDone={() => setReporting(false)} />}
    </div>
  );
}
