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

/** Header for the public website. On phones the links sit in a second row. */
export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Logo />
        <SiteNav links={SITE_LINKS} className="hidden md:flex" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {profile ? (
            <Link href="/dashboard" className="btn-primary">
              My account
            </Link>
          ) : (
            <Link href="/login" className="btn-primary">
              Log in
            </Link>
          )}
        </div>
      </div>
      <SiteNav links={SITE_LINKS} className="flex border-t border-line px-2 md:hidden" />
    </header>
  );
}
