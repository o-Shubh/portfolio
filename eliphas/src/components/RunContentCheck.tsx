"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** Runs the content check (automatically when the current manuscript hasn't been checked) and refreshes the page. */
export function RunContentCheck({ bookId, auto, label = "Check again" }: { bookId: string; auto: boolean; label?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [, start] = useTransition();
  const started = useRef(false);
  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch(`/api/books/${bookId}/content-check`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(body.error ?? "The check didn't finish. Please try again.");
      else start(() => router.refresh());
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setRunning(false);
  }
  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      void run();
    }
    // run once on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {running ? (
        <p role="status" className="text-sm font-medium">
          Checking your manuscript… this can take up to a minute for a long book.
        </p>
      ) : (
        <button type="button" className="btn-ghost min-h-11 px-4 text-sm" onClick={run}>
          {label}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
