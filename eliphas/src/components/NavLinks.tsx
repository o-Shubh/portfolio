"use client";

import {
  BookOpen,
  ClipboardCheck,
  IndianRupee,
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
  money: IndianRupee,
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
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[0.7rem] font-semibold transition ${
                  active ? "bg-primary text-on-primary" : "text-muted"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-2 space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 font-semibold transition ${
                active ? "bg-primary text-on-primary shadow-soft" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
