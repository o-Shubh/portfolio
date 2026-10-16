"use client";

import { useEffect } from "react";

/**
 * Counts a view after the reader has had the page open for a few seconds (not on bots' prefetches).
 * The server counts at most one view per account or browser, per article, per day.
 */
export function ViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/articles/${articleId}/view`, { method: "POST", keepalive: true }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [articleId]);
  return null;
}
