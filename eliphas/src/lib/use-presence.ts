"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a sheet or menu mounted while it animates closed, so open and close use the same transition.
 * `shown` drives the CSS state; because it's a transition (not a keyframe), clicking again mid-way
 * reverses smoothly from wherever it is. With reduced motion the global rule makes the change instant.
 */
export function usePresence(open: boolean, exitMs = 340) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);
  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);
  useEffect(() => {
    if (open && mounted) {
      // Next frame, so the closed state is painted first and the opening transition runs
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    if (!open && mounted) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t = setTimeout(() => setMounted(false), still ? 0 : exitMs);
      return () => clearTimeout(t);
    }
  }, [open, mounted, exitMs]);
  return { mounted, shown };
}
