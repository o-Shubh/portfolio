/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage at many sizes */

// Brand-coloured backgrounds for books that don't have a cover image yet.
const PALETTES = [
  { bg: "#17214A", fg: "#F3F4F7", accent: "#C98200" },
  { bg: "#2E6150", fg: "#F3F4F7", accent: "#E9C46A" },
  { bg: "#C98200", fg: "#2E1E00", accent: "#17214A" },
  { bg: "#F3F4F7", fg: "#17214A", accent: "#2E6150" },
  { bg: "#5A2A27", fg: "#F7EDE2", accent: "#C98200" },
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
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const shell =
    "relative aspect-[2/3] w-full overflow-hidden rounded-r-md rounded-l-sm shadow-[0_8px_20px_-8px_rgb(0_0_0/0.45)] ring-1 ring-black/10 dark:ring-white/15";

  if (src) {
    return (
      <div className={shell}>
        <img
          src={src}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
        />
      </div>
    );
  }

  const p = pick(slug);
  const titleSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <div className={shell} style={{ background: p.bg, color: p.fg }} role="img" aria-label={`Cover of ${title}`}>
      {/* spine shadow */}
      <div className="absolute inset-y-0 left-0 w-2 bg-black/15" />
      <div className="flex h-full flex-col justify-between p-[9%] pl-[13%]">
        <div className="h-1 w-10 rounded" style={{ background: p.accent }} />
        <p className={`font-heading font-semibold leading-snug ${titleSize}`} style={{ overflowWrap: "anywhere" }}>
          {title}
        </p>
        <p className="text-sm font-medium opacity-85">{author}</p>
      </div>
    </div>
  );
}
