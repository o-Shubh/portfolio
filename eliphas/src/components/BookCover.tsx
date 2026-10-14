/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage at many sizes */

// Brand-coloured backgrounds for books that don't have a cover image yet.
const PALETTES = [
  { from: "#233070", to: "#17214A", fg: "#F3F4F7", accent: "#E0A12A" },
  { from: "#3B7A65", to: "#244C3F", fg: "#F3F4F7", accent: "#F2CF7E" },
  { from: "#DB9512", to: "#B87500", fg: "#2E1E00", accent: "#17214A" },
  { from: "#FFFFFF", to: "#E4E7F0", fg: "#17214A", accent: "#2E6150" },
  { from: "#7A3A34", to: "#4E2420", fg: "#F7EDE2", accent: "#E0A12A" },
];

function pick(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
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
  const radius = size === "xs" ? "rounded-md" : "rounded-l-md rounded-r-xl";
  const shell = `relative aspect-[2/3] w-full overflow-hidden ${radius} shadow-[0_2px_4px_rgb(0_0_0/0.08),0_18px_32px_-14px_rgb(0_0_0/0.45)] ring-1 ring-black/5 dark:ring-white/10`;
  // Light sheen + spine crease, so flat covers look like books
  const sheen = (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/25 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-[6%] w-px bg-white/25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10" />
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
  const titleSize =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-[1.05rem]" : size === "xs" ? "text-[0.55rem] leading-tight" : "text-xl";
  return (
    <div
      className={shell}
      style={{ background: `linear-gradient(160deg, ${p.from}, ${p.to})`, color: p.fg }}
      role="img"
      aria-label={`Cover of ${title}`}
    >
      <div className="flex h-full flex-col justify-between p-[10%] pl-[14%]">
        <div className="h-1 w-[28%] rounded-full" style={{ background: p.accent }} />
        <p className={`line-clamp-4 font-heading font-semibold leading-snug tracking-tight ${titleSize}`} style={{ overflowWrap: "break-word" }}>
          {title}
        </p>
        {size === "xs" ? <span /> : <p className="text-[0.8rem] font-semibold opacity-80">{author}</p>}
      </div>
      {sheen}
    </div>
  );
}
