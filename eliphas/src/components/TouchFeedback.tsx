"use client";

import { useEffect } from "react";

/** iPhone Safari only shows :active (pressed) styles once the page listens for touches. Passive, so scrolling stays native. */
export function TouchFeedback() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
