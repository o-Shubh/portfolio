"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page fails to load. The header and footer stay in place. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-x flex flex-1 flex-col items-start justify-center py-24">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 max-w-xl text-4xl">This page didn&apos;t load.</h1>
      <p className="mt-4 max-w-md text-muted">
        It&apos;s usually a brief connection problem. Try again, and if it keeps happening, let us know.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go to home
        </Link>
      </div>
    </div>
  );
}
