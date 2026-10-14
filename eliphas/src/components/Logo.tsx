import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#1B2659" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="9.5" fill="none" stroke="#fff" strokeOpacity="0.14" />
      <path d="M7 10.5c3-1.2 6-1 9 1v12c-3-2-6-2.2-9-1z" fill="#C98200" />
      <path d="M25 10.5c-3-1.2-6-1-9 1v12c3-2 6-2.2 9-1z" fill="#F3F4F7" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Eliphas Indicus Publications, home">
      <LogoMark />
      <span className="leading-none">
        <span className={`block font-heading text-[1.05rem] font-semibold tracking-tight ${light ? "text-paper" : ""}`}>
          Eliphas Indicus
        </span>
        <span className={`mt-1 block text-[0.62rem] font-semibold tracking-[0.22em] uppercase ${light ? "text-paper/60" : "text-muted"}`}>
          Publications
        </span>
      </span>
    </Link>
  );
}
