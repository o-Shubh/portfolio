import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABEL, type Profile } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { Logo } from "./Logo";
import { NavLinks, type NavItem } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Layout for logged-in areas (reader, author, printer, admin).
 * Phone: top bar + bottom tab bar. Tablet/desktop: left sidebar.
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
  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      {/* Sidebar (md and up) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <Logo href="/" />
        <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted">{areaLabel}</p>
        <NavLinks items={nav} variant="sidebar" />
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <AccountSummary profile={profile} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOut} className="flex-1">
              <button className="btn-ghost w-full" type="submit">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2 backdrop-blur md:hidden">
        <Logo href="/" />
        <div className="flex items-center">
          <ThemeToggle />
          <form action={signOut}>
            <button
              className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2"
              type="submit"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Bottom tabs (phones) */}
      <nav
        aria-label={`${areaLabel} navigation`}
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:hidden"
      >
        <NavLinks items={nav} variant="tabs" />
      </nav>
    </div>
  );
}

function AccountSummary({ profile }: { profile: Profile }) {
  return (
    <Link href="/account/profile" className="block rounded-xl px-3 py-2 hover:bg-surface-2">
      <span className="block truncate font-semibold">{profile.full_name}</span>
      <span className="block text-sm text-muted">
        {ROLE_LABEL[profile.role]} · {formatPhone(profile.phone)}
      </span>
    </Link>
  );
}
