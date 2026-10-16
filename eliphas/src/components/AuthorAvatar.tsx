/** Initials in a navy circle (authors don't upload photos yet). */
export function AuthorAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => [...w][0]?.toUpperCase())
      .join("") || "?";
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-navy font-semibold text-gold ring-2 ring-gold/40 ${dims}`}>
      {initials}
    </span>
  );
}
