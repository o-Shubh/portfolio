"use client";

import { useEffect, useRef } from "react";

/**
 * A printed book in 3D: the cover on the front, a spine, ivory page edges and a soft floor shadow.
 * Thickness follows the real page count. With a mouse it turns gently toward the pointer; on touch
 * screens and for people who ask for reduced motion it stays in its resting pose (pure CSS, no JS motion).
 */
export function Book3D({
  children,
  pages,
  spine = "#17214A",
  pose = "pages",
  interactive = true,
  className = "",
}: {
  /** The front cover (usually <BookCover />) */
  children: React.ReactNode;
  /** Page count; sets the thickness */
  pages?: number | null;
  /** Spine colour */
  spine?: string;
  /** Resting angle: show the page edges (default) or the spine */
  pose?: "pages" | "spine";
  interactive?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;
    // Follow the pointer over the nearest section, so the book reacts before the pointer reaches it
    const zone = (el.closest("[data-book3d-zone]") as HTMLElement | null) ?? el;
    let frame = 0;
    const move = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      const x = Math.max(
        -1,
        Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1),
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-y", `${x * 14}deg`);
        el.style.setProperty("--tilt-x", `${y * -7}deg`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--tilt-y", "0deg");
      el.style.setProperty("--tilt-x", "0deg");
    };
    zone.addEventListener("pointermove", move);
    zone.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      zone.removeEventListener("pointermove", move);
      zone.removeEventListener("pointerleave", leave);
    };
  }, [interactive]);

  // Real books: about 0.055 mm per page against a 127 mm (5 in) width
  const depth = Math.max(5, Math.min(22, (pages ?? 200) * 0.045));
  return (
    <div
      ref={ref}
      className={`book3d ${pose === "spine" ? "book3d-spine" : ""} ${className}`}
      style={
        { "--depth": `${depth}cqw`, "--spine": spine } as React.CSSProperties
      }
    >
      <div className="book3d-shadow" aria-hidden />
      <div className="book3d-body">
        <div className="book3d-front">{children}</div>
        <div className="book3d-back" aria-hidden />
        <div className="book3d-left" aria-hidden />
        <div className="book3d-right" aria-hidden />
        <div className="book3d-top" aria-hidden />
      </div>
    </div>
  );
}
