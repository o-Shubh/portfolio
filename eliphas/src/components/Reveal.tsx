"use client";

import { useEffect, useRef } from "react";

/**
 * Fades a section up 12px as it scrolls into view. Content is visible by default: it is only hidden once
 * JavaScript has confirmed the section is still below the fold, and never for people who ask for reduced motion.
 */
export function Reveal({ children, className = "", as: Tag = "div", ...rest }: { children: React.ReactNode; className?: string; as?: "div" | "section" } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already on screen: leave it alone
    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "shown";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
