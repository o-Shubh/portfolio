import { Search } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SiteNav } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";

export const SITE_LINKS = [
  { href: "/books", label: "Bookstore" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

/** Public website header: hairline, translucent, with a full-screen menu on phones. */
export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const account = profile
    ? { href: "/dashboard", label: "My account" }
    : { href: "/login", label: "Log in" };

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="container-x flex h-16 items-center gap-6">
        <Logo />
        <SiteNav links={SITE_LINKS} className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/books"
            className="hidden h-10 w-10 place-items-center rounded-full text-fg transition hover:bg-surface-2 md:grid"
            aria-label="Search books"
          >
            <Search className="h-[1.15rem] w-[1.15rem]" />
          </Link>
          <span className="hidden md:block">
            <ThemeToggle />
          </span>
          <Link href={account.href} className="hidden px-3 text-[0.9375rem] font-medium text-fg hover:text-muted md:block">
            {account.label}
          </Link>
          {!profile && (
            <Link href="/login?next=/author" className="btn-primary hidden min-h-10 px-4 md:inline-flex">
              Start publishing
            </Link>
          )}
          <MobileMenu links={SITE_LINKS} account={account} showPublish={!profile} />
        </div>
      </div>
    </header>
  );
}
