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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  if (variant === "tabs") {
    return (
      <ul className="flex justify-around">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[0.68rem] font-medium transition ${
                  active ? "text-accent-fg" : "text-muted"
                }`}
              >
                <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
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
              className={`flex h-10 items-center gap-2.5 rounded-lg px-3 text-[0.9375rem] transition ${
                active ? "bg-primary font-medium text-on-primary" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
