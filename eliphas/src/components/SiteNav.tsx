"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav({ links, className = "" }: { links: { href: string; label: string }[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex w-full justify-around gap-1 md:justify-start">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 font-medium ${
                  active ? "text-fg underline decoration-marigold decoration-2 underline-offset-8" : "text-muted hover:text-fg"
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
