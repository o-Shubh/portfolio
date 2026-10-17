import type { NavItem } from "@/components/NavLinks";
import type { Role } from "@/lib/auth";

// Navigation for each logged-in area. Later milestones add items here.
export const AUTHOR_NAV: NavItem[] = [
  { href: "/author", label: "Overview", icon: "dashboard", exact: true },
  { href: "/author/books", label: "My books", icon: "books" },
  { href: "/author/earnings", label: "Earnings & payouts", icon: "money" },
  { href: "/author/orders", label: "Orders", icon: "orders" },
  { href: "/author/community", label: "Community", icon: "community", sidebarOnly: true },
  { href: "/author/articles", label: "My articles", icon: "articles", sidebarOnly: true },
  { href: "/author/services", label: "Services", icon: "services", sidebarOnly: true },
  { href: "/author/plan", label: "Pro membership", icon: "plan", sidebarOnly: true },
  { href: "/author/analytics", label: "Analytics", icon: "analytics", sidebarOnly: true },
  { href: "/author/payments", label: "Service payments", icon: "finance", sidebarOnly: true },
  { href: "/account/profile", label: "Settings & help", icon: "settings", sidebarOnly: true },
];

export const PRINTER_NAV: NavItem[] = [
  { href: "/printer", label: "Jobs", icon: "printer", exact: true },
  { href: "/account", label: "Account", icon: "profile" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { href: "/admin/review", label: "Review", icon: "review" },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/printers", label: "Printers", icon: "printer" },
  { href: "/admin/services", label: "Services", icon: "services" },
  { href: "/admin/payouts", label: "Payouts", icon: "money", sidebarOnly: true },
  { href: "/admin/finance", label: "Finance", icon: "finance", sidebarOnly: true },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "plan", sidebarOnly: true },
  { href: "/admin/issues", label: "Issues", icon: "issues", sidebarOnly: true },
  { href: "/admin/authors", label: "Authors", icon: "profile", sidebarOnly: true },
  { href: "/admin/editions", label: "Edition IDs", icon: "books", sidebarOnly: true },
  { href: "/admin/moderation", label: "Moderation", icon: "moderation", sidebarOnly: true },
  { href: "/admin/shipping", label: "Shipping", icon: "shipping", sidebarOnly: true },
  { href: "/admin/plans", label: "Plans", icon: "plan", sidebarOnly: true },
  { href: "/admin/settings", label: "Settings", icon: "settings", sidebarOnly: true },
];

/** The account area is shared by everyone; it links back to their workspace. */
export function accountNav(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: "/account", label: "My orders", icon: "shop", exact: true },
    { href: "/account/profile", label: "Profile", icon: "profile" },
    { href: "/account/saved", label: "Saved", icon: "saved" },
    { href: "/account/notifications", label: "Notifications", icon: "notifications" },
    { href: "/account/verification", label: "Author verification", icon: "review" },
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
