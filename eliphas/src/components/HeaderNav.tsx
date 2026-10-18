"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Desktop main navigation as a segmented pill (macOS toolbar style); the current section is raised. */
export function HeaderNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Main" className="segmented hidden lg:inline-flex">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined} className="segment px-2.5 text-[0.8125rem] whitespace-nowrap xl:px-3">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
