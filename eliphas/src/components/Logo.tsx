import Link from "next/link";

/** Three stacked book spines that read as an "E". The middle spine carries the accent. */
export function LogoMark({ className = "h-8 w-8", light = false }: { className?: string; light?: boolean }) {
  // `light`: always the white version (for dark backgrounds)
  const box = light ? "fill-paper" : "fill-ink dark:fill-paper";
  const bar = light ? "fill-ink" : "fill-paper dark:fill-ink";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className={box} />
      <rect x="9" y="8" width="14" height="4" rx="1" className={bar} />
      <rect x="9" y="14" width="10.5" height="4" rx="1" fill="#FF5A1F" />
      <rect x="9" y="20" width="14" height="4" rx="1" className={bar} />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Eliphas Indicus Publications, home">
      <LogoMark light={light} />
      <span className={`font-heading text-[1.3rem] leading-none tracking-[-0.02em] ${light ? "text-paper" : ""}`}>
        Eliphas<span className={`hidden sm:inline ${light ? "text-paper/60" : "text-muted"}`}> Indicus</span>
      </span>
    </Link>
  );
}
