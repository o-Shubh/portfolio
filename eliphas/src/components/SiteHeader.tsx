import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Logo } from "./Logo";
import { SiteNav } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";

export const SITE_LINKS = [
  { href: "/books", label: "Bookstore" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

/** Floating glass header for the public website. On phones the links sit in a second row. */
export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="safe-top sticky top-0 z-30 px-3 pt-3">
      <div className="mx-auto max-w-6xl rounded-[1.75rem] bg-surface/75 shadow-soft ring-1 ring-line backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center justify-between gap-3 py-2 pr-2 pl-4">
          <Logo />
          <SiteNav links={SITE_LINKS} className="hidden md:flex" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {profile ? (
              <Link href="/dashboard" className="btn-primary min-h-10 px-5">
                My account
              </Link>
            ) : (
              <Link href="/login" className="btn-primary min-h-10 px-5">
                Log in
              </Link>
            )}
          </div>
        </div>
        <SiteNav links={SITE_LINKS} className="flex border-t border-line px-2 py-1 md:hidden" />
      </div>
    </header>
  );
}
