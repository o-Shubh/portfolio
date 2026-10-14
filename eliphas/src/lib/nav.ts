import type { NavItem } from "@/components/NavLinks";
import type { Role } from "@/lib/auth";

// Navigation for each logged-in area. Later milestones add items here.
export const AUTHOR_NAV: NavItem[] = [
  { href: "/author", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/author/books", label: "My books", icon: "books" },
  { href: "/account", label: "Account", icon: "profile" },
];

export const PRINTER_NAV: NavItem[] = [
  { href: "/printer", label: "Jobs", icon: "printer", exact: true },
  { href: "/account", label: "Account", icon: "profile" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { href: "/account", label: "Account", icon: "profile" },
];

/** The account area is shared by everyone; it links back to their workspace. */
export function accountNav(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: "/account", label: "My orders", icon: "shop", exact: true },
    { href: "/account/profile", label: "Profile", icon: "profile" },
  ];
  const workspace: Record<Role, NavItem | null> = {
    reader: null,
    author: { href: "/author", label: "Author", icon: "books" },
    printer: { href: "/printer", label: "Printer", icon: "printer" },
    admin: { href: "/admin", label: "Admin", icon: "settings" },
  };
  const w = workspace[role];
  return w ? [w, ...items] : items;
}
