"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setSaved } from "@/app/actions/wishlist";
import { offlineSafe } from "@/lib/use-form-action";

/** "Save for later" on a book. Logged-out visitors are sent to log in and come back. */
export function SaveBookButton({
  bookId,
  slug,
  saved: initial,
  loggedIn,
  className = "",
}: {
  bookId: string;
  slug: string;
  saved: boolean;
  loggedIn: boolean;
  className?: string;
}) {
  const [saved, setSavedState] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const cls = `btn-ghost min-h-11 gap-2 ${className}`;
  if (!loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/books/${slug}`)}`} className={cls}>
        <Heart className="h-4 w-4" aria-hidden /> Save for later
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        className={cls}
        aria-pressed={saved}
        disabled={pending}
        data-testid="save-book"
        onClick={() =>
          start(async () => {
            setError("");
            const res = await offlineSafe(setSaved(bookId, !saved));
            if ("error" in res) setError(res.error);
            else setSavedState(res.saved);
          })
        }
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-current text-danger" : ""}`} aria-hidden />
        {saved ? "Saved" : "Save for later"}
      </button>
      <span role="status" className={error ? "text-sm text-danger" : "sr-only"}>
        {error || (saved ? "Saved. We'll tell you if the price drops." : "")}
      </span>
    </>
  );
}
