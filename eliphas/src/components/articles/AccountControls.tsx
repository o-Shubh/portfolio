"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markNotificationsRead, setArticleNotifications, setBlock, setBookmark } from "@/app/actions/community";
import { offlineSafe } from "@/lib/use-form-action";

export function RemoveSaved({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="min-h-10 text-sm font-semibold text-muted underline-offset-2 hover:text-fg hover:underline"
      onClick={() =>
        start(async () => {
          await setBookmark(articleId, false);
          router.refresh();
        })
      }
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function ArticleNotificationToggle({ on }: { on: boolean }) {
  const [value, setValue] = useState(on);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 accent-fg"
        checked={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          setSaved(false);
          start(async () => {
            const res = await offlineSafe(setArticleNotifications(next));
            if ("ok" in res) setSaved(true);
            else setValue(!next);
          });
        }}
      />
      <span>
        <span className="block font-semibold">New articles from authors I follow</span>
        <span className="text-sm text-muted">
          An in-app notification here when an author you follow publishes a new article. Never by SMS.
          {saved && <span role="status" className="ml-2 font-medium text-success">Saved.</span>}
        </span>
      </span>
    </label>
  );
}

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost min-h-10 text-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markNotificationsRead();
          router.refresh();
        })
      }
    >
      Mark all as read
    </button>
  );
}

export function Unblock({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost min-h-9 text-sm"
      disabled={pending}
      aria-label={`Unblock ${name}`}
      onClick={() =>
        start(async () => {
          await setBlock(userId, false);
          router.refresh();
        })
      }
    >
      Unblock
    </button>
  );
}
