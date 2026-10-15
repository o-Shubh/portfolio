"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav({ links, className = "" }: { links: { href: string; label: string }[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex items-center gap-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center rounded-full px-3 text-[0.9375rem] transition ${
                  active ? "font-medium text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
