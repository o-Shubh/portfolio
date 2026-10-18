/* eslint-disable @next/next/no-img-element -- profile photos come from Supabase Storage */
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABEL, type Profile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatars";
import { formatPhone } from "@/lib/phone";
import { InstallPrompt } from "./InstallPrompt";
import { Logo } from "./Logo";
import { NavLinks, type NavItem } from "./NavLinks";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Layout for logged-in areas (reader, author, printer, admin).
 * Phone: top bar + bottom tab bar. Tablet/desktop: sidebar.
 */
export function AppShell({
  profile,
  areaLabel,
  nav,
  children,
}: {
  profile: Profile;
  areaLabel: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const photo = avatarUrl(profile.avatar_path);
  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      {/* Sidebar (md and up) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 md:flex">
        <div className="px-2">
          <Logo href="/" className="h-11" />
        </div>
        <p className="mt-8 px-2 text-xs font-medium text-muted">{areaLabel}</p>
        <NavLinks items={nav} variant="sidebar" />
        <div className="mt-auto space-y-1 border-t border-line pt-3">
          <Link href="/account/profile" className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-surface-2">
            {photo ? (
              <img src={photo} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-accent-fg ring-1 ring-line">
                {initials}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{profile.full_name}</span>
              <span className="block truncate text-xs text-muted">
                {ROLE_LABEL[profile.role]} · {formatPhone(profile.phone) || "Google account"}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={profile.id} className="text-muted hover:bg-surface-2 hover:text-fg" />
            <form action={signOut} className="flex-1">
              <button
                className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
                type="submit"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-surface/90 text-fg backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between pr-2 pl-4">
          <Logo href="/" className="h-9" />
          <div className="flex items-center">
            <NotificationBell userId={profile.id} className="h-11 w-11 text-fg hover:bg-surface-2" />
            <Link href="/account/profile" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2" aria-label="My profile and settings">
              {photo ? (
                <img src={photo} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-accent-fg ring-1 ring-line">{initials || <UserRound className="h-4 w-4" />}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-16">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <InstallPrompt aboveTabBar />

      {/* Tab bar (phones) */}
      <nav
        aria-label={`${areaLabel} navigation`}
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden"
      >
        <NavLinks items={nav} variant="tabs" />
      </nav>
    </div>
  );
}
