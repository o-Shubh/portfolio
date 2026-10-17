/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage at many sizes */

// Typographic covers for books that don't have a cover image yet: flat colour, serif title.
const PALETTES = [
  { bg: "#17214A", fg: "#FFFFFF", rule: "#E9A31A" },
  { bg: "#E9A31A", fg: "#17214A", rule: "#17214A" },
  { bg: "#0F5E5C", fg: "#F2F4F8", rule: "#E0B25A" },
  { bg: "#7A2E3A", fg: "#F6EBDD", rule: "#E0B25A" },
  { bg: "#F1E9DA", fg: "#17214A", rule: "#7A2E3A" },
  { bg: "#2F5DA8", fg: "#FFFFFF", rule: "#F3D27A" },
];

function pick(seed: string) {
  // FNV-1a: spreads similar slugs across the palette
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export function BookCover({
  title,
  author,
  slug,
  src,
  size = "md",
  priority = false,
}: {
  title: string;
  author: string;
  slug: string;
  src: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const radius = size === "xs" ? "rounded-[3px]" : "rounded-[4px]";
  const shell = `relative aspect-[2/3] w-full overflow-hidden ${radius} shadow-[0_1px_2px_rgb(0_0_0/0.1),0_12px_28px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/5 dark:ring-white/10`;
  // Spine crease and a soft sheen, so flat covers read as books
  const sheen = (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[5%] bg-gradient-to-r from-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-[5%] w-px bg-white/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10" />
    </>
  );

  if (src) {
    return (
      <div className={shell}>
        <img src={src} alt={`Cover of ${title}`} className="h-full w-full object-cover" loading={priority ? "eager" : "lazy"} />
        {sheen}
      </div>
    );
  }

  const p = pick(slug);
  // Text scales with the cover's own width (container query units), so it fits at every size
  const titleSize = size === "xs" ? "text-[12cqw]" : "text-[11.5cqw]";
  return (
    <div className={`${shell} @container`} style={{ background: p.bg, color: p.fg }} role="img" aria-label={`Cover of ${title}`}>
      <div className="flex h-full flex-col p-[11%] pl-[13%]">
        {size !== "xs" && (
          <p className="truncate text-[max(0.5rem,5.2cqw)] font-medium tracking-[0.18em] uppercase opacity-80">{author}</p>
        )}
        <p
          className={`mt-auto line-clamp-4 font-heading leading-[1.08] font-semibold tracking-[-0.02em] ${titleSize}`}
          style={{ overflowWrap: "break-word" }}
        >
          {title}
        </p>
        <div className="mt-[9%] h-[3px] w-[30%]" style={{ background: p.rule }} />
      </div>
      {sheen}
    </div>
  );
}
