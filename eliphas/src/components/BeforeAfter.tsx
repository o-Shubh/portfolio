"use client";

/* eslint-disable @next/next/no-img-element -- local sample images with known sizes */
import { useId, useState } from "react";

/** Drag (or use the arrow keys on) the handle to compare two images of the same size. */
export function BeforeAfter({
  before,
  after,
  width,
  height,
  label,
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  width: number;
  height: number;
  label: string;
}) {
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <figure className="select-none">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-white shadow-sheet ring-1 ring-line has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-focus" style={{ aspectRatio: `${width} / ${height}` }}>
        <img src={before.src} alt={before.alt} width={width} height={height} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <img
          src={after.src}
          alt={after.alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        />
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">Before</span>
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-primary/85 px-2.5 py-1 text-xs font-medium text-on-primary">After</span>
        {/* Divider and handle (visual only; the range input below is the real control) */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.15)]" style={{ left: `calc(${pos}% - 1px)` }} aria-hidden>
          <span className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#17214A] shadow-lift">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
            </svg>
          </span>
        </div>
        <label htmlFor={id} className="sr-only">
          {label}: move to compare before and after
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="before-after-range absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          aria-valuetext={`${pos}% showing before`}
        />
      </div>
    </figure>
  );
}
