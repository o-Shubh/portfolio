import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABEL, type Profile } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { Logo } from "./Logo";
import { NavLinks, type NavItem } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Layout for logged-in areas (reader, author, printer, admin).
 * Phone: glass top bar + floating tab bar. Tablet/desktop: sidebar.
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
  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      {/* Sidebar (md and up) */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col p-3 md:flex">
        <div className="flex h-full flex-col rounded-[1.75rem] bg-surface p-4 shadow-soft ring-1 ring-line">
          <div className="px-2 pt-1">
            <Logo href="/" />
          </div>
          <p className="mt-8 px-3 text-[0.7rem] font-bold tracking-[0.16em] text-muted uppercase">{areaLabel}</p>
          <NavLinks items={nav} variant="sidebar" />
          <div className="mt-auto space-y-2">
            <Link href="/account/profile" className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-surface-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marigold font-semibold text-on-marigold">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{profile.full_name}</span>
                <span className="block truncate text-xs text-muted">
                  {ROLE_LABEL[profile.role]} · {formatPhone(profile.phone)}
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <form action={signOut} className="flex-1">
                <button className="btn-ghost min-h-11 w-full" type="submit">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="safe-top sticky top-0 z-20 px-3 pt-3 md:hidden">
        <div className="flex items-center justify-between rounded-[1.5rem] bg-surface/80 py-1.5 pr-1.5 pl-3 shadow-soft ring-1 ring-line backdrop-blur-xl">
          <Logo href="/" />
          <div className="flex items-center">
            <ThemeToggle />
            <form action={signOut}>
              <button className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2" type="submit" aria-label="Log out">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
            <Link
              href="/account/profile"
              className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-marigold text-sm font-semibold text-on-marigold"
              aria-label="My profile"
            >
              {initials || <UserRound className="h-5 w-5" />}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Floating tab bar (phones) */}
      <nav aria-label={`${areaLabel} navigation`} className="safe-bottom fixed inset-x-0 bottom-0 z-20 px-3 pb-3 md:hidden">
        <div className="rounded-[1.75rem] bg-surface/85 p-1.5 shadow-lift ring-1 ring-line backdrop-blur-xl">
          <NavLinks items={nav} variant="tabs" />
        </div>
      </nav>
    </div>
  );
}
