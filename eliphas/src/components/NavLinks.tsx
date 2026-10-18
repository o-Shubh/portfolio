"use client";

import {
  BookOpen,
  ClipboardCheck,
  Wallet,
  LayoutDashboard,
  Package,
  Printer,
  Settings,
  ShoppingBag,
  UserRound,
  Sparkles,
  BarChart3,
  Truck,
  Crown,
  AlertTriangle,
  Receipt,
  Newspaper,
  Bookmark,
  Bell,
  ShieldAlert,
  MoreHorizontal,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";

// Icons are referenced by name so server layouts can pass plain data.
const ICONS = {
  dashboard: LayoutDashboard,
  books: BookOpen,
  review: ClipboardCheck,
  money: Wallet,
  orders: Package,
  printer: Printer,
  settings: Settings,
  shop: ShoppingBag,
  profile: UserRound,
  services: Sparkles,
  analytics: BarChart3,
  shipping: Truck,
  plan: Crown,
  issues: AlertTriangle,
  finance: Receipt,
  articles: Newspaper,
  saved: Bookmark,
  notifications: Bell,
  moderation: ShieldAlert,
  community: MessagesSquare,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; /** hide from the phone tab bar (sidebar only) */ sidebarOnly?: boolean };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  if (variant === "tabs") {
    // Phones: up to five tabs. When there are more sections, the fifth tab is "More" and opens a sheet with the rest.
    const primary = items.filter((i) => !i.sidebarOnly);
    const shown = items.length <= 5 ? items : primary.slice(0, 4);
    const rest = items.filter((i) => !shown.includes(i));
    const tab = (active: boolean) =>
      `flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition ${active ? "text-primary dark:text-accent-fg" : "text-muted"}`;
    return (
      <ul className="flex justify-around">
        {shown.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href} className="flex-1">
              <Link href={item.href} aria-current={active ? "page" : undefined} className={tab(active)}>
                <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="flex-1">
            <MoreSheet items={rest} active={rest.some(isActive)} className={tab(rest.some(isActive))} isActive={isActive} />
          </li>
        )}
      </ul>
    );
  }

  return (
    <ul className="mt-2 space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-2.5 rounded-lg px-3 text-[0.9375rem] transition pointer-fine:h-9 ${
                active ? "bg-surface-3 font-medium text-fg" : "text-fg/80 hover:bg-surface-3/60 hover:text-fg"
              }`}
            >
              <Icon className={`h-[1.1rem] w-[1.1rem] ${active ? "text-primary dark:text-accent-fg" : "text-muted"}`} aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MoreSheet({ items, active, className, isActive }: { items: NavItem[]; active: boolean; className: string; isActive: (i: NavItem) => boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const sheet = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDialogFocus(open, sheet, close);
  return (
    <>
      <button type="button" className={className} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <MoreHorizontal className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        More
      </button>
      {open && (
        <div ref={sheet} className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-black/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)] bg-surface pt-2 shadow-lift">
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            <ul className="px-2 pb-2">
              {items.map((item) => {
                const Icon = ICONS[item.icon];
                const on = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={on ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3 text-base ${on ? "bg-surface-2 font-semibold" : ""}`}
                    >
                      <Icon className="h-5 w-5 text-muted" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
