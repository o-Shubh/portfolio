import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#17214A" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="#F3F4F7" strokeOpacity="0.18" />
      <path d="M7 10.5c3-1.2 6-1 9 1v12c-3-2-6-2.2-9-1z" fill="#C98200" />
      <path d="M25 10.5c-3-1.2-6-1-9 1v12c3-2 6-2.2 9-1z" fill="#F3F4F7" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Eliphas Indicus Publications, home">
      <LogoMark />
      <span className="leading-tight">
        <span className="block font-heading text-lg font-semibold">Eliphas Indicus</span>
        <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-muted">Publications</span>
      </span>
    </Link>
  );
}
