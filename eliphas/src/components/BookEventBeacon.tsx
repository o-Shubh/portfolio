"use client";

import { useEffect } from "react";

/** Tells the server once a day per book that this browser viewed it (or opened its sample). Counts only. */
export function countBookEvent(slug: string, kind: "view" | "sample") {
  const key = `eip_${kind}_${slug}_${new Date().toISOString().slice(0, 10)}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // storage blocked: still count, at most once per page load
  }
  void fetch(`/api/book/${encodeURIComponent(slug)}/event?k=${kind}`, { method: "POST", keepalive: true }).catch(() => {});
}

export function BookEventBeacon({ slug, kind }: { slug: string; kind: "view" | "sample" }) {
  useEffect(() => countBookEvent(slug, kind), [slug, kind]);
  return null;
}
