/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { avatarUrl } from "@/lib/avatars";

/** Profile photo, or initials in a navy circle when there's no photo. Decorative: the name is always shown next to it. */
export function AuthorAvatar({ name, path, size = "md" }: { name: string | null; path?: string | null; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm";
  const src = avatarUrl(path);
  if (src) return <img src={src} alt="" width={64} height={64} loading="lazy" className={`shrink-0 rounded-full object-cover ring-1 ring-line ${dims}`} />;
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => [...w][0]?.toUpperCase())
      .join("") || "?";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-surface-2 font-semibold text-accent-fg ring-1 ring-line ${dims}`}>
      {initials}
    </span>
  );
}
