"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page fails to load. The header and footer stay in place. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-x flex flex-1 flex-col items-center justify-center py-16">
      <div className="w-full max-w-md rounded-[18px] bg-surface p-8 shadow-sheet ring-1 ring-line">
      <p className="mono text-xs tracking-[0.06em] text-danger uppercase">Something went wrong</p>
      <h1 className="display mt-2 text-3xl">This page didn&apos;t load.</h1>
      <p className="mt-3 text-muted">
        It&apos;s usually a brief connection problem. Try again, and if it keeps happening, let us know.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-muted">
          Reference: <span className="id-mono select-all">{error.digest}</span>
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go to home
        </Link>
      </div>
      </div>
    </div>
  );
}
