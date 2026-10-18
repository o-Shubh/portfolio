"use client";

import { Check, UserPlus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { setFollow } from "@/app/actions/community";
import { useClearIntent, useGate } from "./useGate";
import { offlineSafe } from "@/lib/use-form-action";

/** Follow an author to get an in-app notification when they publish a new article. */
export function FollowButton({ authorId, authorName, following, intent, className = "" }: { authorId: string; authorName: string; following: boolean; intent?: string | null; className?: string }) {
  const gate = useGate();
  const clearIntent = useClearIntent();
  const [on, setOn] = useState(following);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  const run = (next: boolean) =>
    start(async () => {
      const res = await offlineSafe(setFollow(authorId, next));
      const msg = gate(res, "follow");
      if ("ok" in res) setOn(next);
      setError(msg);
    });

  useEffect(() => {
    if (intent !== "follow" || ran.current) return;
    ran.current = true;
    if (!following) run(true);
    clearIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when returning from login
  }, [intent]);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => run(!on)}
        disabled={pending}
        aria-pressed={on}
        aria-label={on ? `Following ${authorName}. Unfollow` : `Follow ${authorName}`}
        className={`${on ? "btn-ghost" : "btn-primary"} min-h-11 px-4 text-sm pointer-fine:min-h-9 ${className}`}
      >
        {on ? <Check className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
        {on ? "Following" : "Follow"}
      </button>
      {error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
