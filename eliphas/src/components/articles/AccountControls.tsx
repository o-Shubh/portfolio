"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markNotificationsRead, setArticleNotifications, setBlock, setBookmark, setNotificationPref, type NotificationPref } from "@/app/actions/community";
import { setPostNotifications } from "@/app/actions/posts";
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
    <SwitchRow
      label="New articles from authors I follow"
      hint="When an author you follow publishes a new article."
      checked={value}
      disabled={pending}
      saved={saved}
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

export function PostNotificationToggle({ on }: { on: boolean }) {
  const [value, setValue] = useState(on);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <SwitchRow
      label="Community posts from people I follow"
      hint="When someone you follow posts in Community."
      checked={value}
      disabled={pending}
      saved={saved}
      onChange={(e) => {
        const next = e.target.checked;
        setValue(next);
        setSaved(false);
        start(async () => {
          const res = await offlineSafe(setPostNotifications(next));
          if ("ok" in res) setSaved(true);
          else setValue(!next);
        });
      }}
    />
  );
}

/** On/off for a notification type (new followers, replies). In-app only. */
export function PrefToggle({ field, on, label, hint }: { field: NotificationPref; on: boolean; label: string; hint: string }) {
  const [value, setValue] = useState(on);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <SwitchRow
      label={label}
      hint={hint}
      checked={value}
      disabled={pending}
      saved={saved}
      error={error}
      testId={`pref-${field}`}
      onChange={(e) => {
        const next = e.target.checked;
        setValue(next);
        setSaved(false);
        start(async () => {
          setError("");
          const res = await offlineSafe(setNotificationPref(field, next));
          if ("ok" in res) setSaved(true);
          else {
            setValue(!next);
            if ("error" in res && res.error) setError(res.error);
          }
        });
      }}
    />
  );
}

/** A settings row: label and hint on the left, an on/off switch on the right. */
function SwitchRow({
  label,
  hint,
  checked,
  disabled,
  saved,
  error,
  testId,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  saved: boolean;
  error?: string;
  testId?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="group-row cursor-pointer justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted">
          {hint}
          {saved && (
            <span role="status" className="ml-2 font-medium text-success">
              Saved.
            </span>
          )}
          {error && (
            <span role="alert" className="ml-2 font-medium text-danger">
              {error}
            </span>
          )}
        </span>
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} disabled={disabled} data-testid={testId} onChange={onChange} />
    </label>
  );
}
