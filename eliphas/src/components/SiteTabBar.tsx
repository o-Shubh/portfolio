"use client";

import { BookOpen, House, MessagesSquare, Newspaper, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { href: "/books", label: "Books", icon: BookOpen, match: (p: string) => p === "/books" },
  { href: "/community", label: "Community", icon: MessagesSquare, match: (p: string) => p.startsWith("/community") || p.startsWith("/authors") },
  { href: "/articles", label: "Articles", icon: Newspaper, match: (p: string) => p.startsWith("/articles") },
];

/** Bottom tab bar on phones, like a shopping app. Hidden on book and checkout pages, which have their own buy bar. */
export function SiteTabBar({ accountHref }: { accountHref: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/books/") || pathname.startsWith("/checkout")) return null;
  const tabs = [...TABS, { href: accountHref, label: "Account", icon: UserRound, match: (p: string) => p.startsWith("/login") }];
  return (
    <nav aria-label="Sections" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden">
      <ul className="flex">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.label} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium ${active ? "text-accent-fg" : "text-muted"}`}
              >
                <t.icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
