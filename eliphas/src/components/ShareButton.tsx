"use client";

import { Check, Share } from "lucide-react";
import { useState } from "react";

/** Opens the device share sheet when there is one; otherwise copies the link. Uses the current page address when no path is given. */
export function ShareButton({ path, title, label = "Share", className = "btn-ghost min-h-11 gap-2 px-3 text-sm pointer-fine:min-h-9" }: { path?: string; title?: string; label?: string; className?: string }) {
  const [note, setNote] = useState("");
  async function share() {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title });
        return;
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
      setTimeout(() => setNote(""), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }
  return (
    <button type="button" className={className} onClick={share}>
      {note ? <Check className="h-4 w-4" aria-hidden /> : <Share className="h-4 w-4" aria-hidden />}
      {note || label}
      <span className="sr-only" role="status">
        {note}
      </span>
    </button>
  );
}
