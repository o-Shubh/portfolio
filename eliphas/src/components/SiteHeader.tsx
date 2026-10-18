import { Search, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { cartBadgeCount } from "@/lib/cart";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

export const SITE_LINKS = [
  { href: "/books", label: "Bookstore" },
  { href: "/authors", label: "Authors" },
  { href: "/community", label: "Community" },
  { href: "/articles", label: "Articles" },
  { href: "/pricing", label: "Publish a book" },
];

/** Search form used in the header. A plain GET form: works before JavaScript loads. */
function SearchBar({ id, className = "" }: { id: string; className?: string }) {
  return (
    <form action="/books" role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search books
      </label>
      <input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        placeholder="Search books, authors, genres"
        className="h-11 w-full rounded-[var(--radius-control)] border-0 bg-surface-2 pr-12 pl-4 text-base text-fg outline-none placeholder:text-muted focus:bg-surface focus:ring-2 focus:ring-focus"
      />
      <button type="submit" aria-label="Search" className="absolute top-0 right-0 grid h-11 w-11 place-items-center rounded-r-[var(--radius-control)] text-muted hover:text-fg">
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}

/** Site header: logo, search, a few clear destinations, account and cart. */
export async function SiteHeader() {
  const [profile, inCart] = await Promise.all([getCurrentProfile(), cartBadgeCount()]);
  const account = profile ? { href: "/dashboard", label: "My account" } : { href: "/login", label: "Log in" };
  const icon = "relative grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-surface-2";

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-surface/90 text-fg backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-surface">
      <div className="container-x flex h-16 items-center gap-3 lg:gap-6">
        <Logo className="h-10 md:h-11" />
        <SearchBar id="q-desktop" className="hidden max-w-xl flex-1 md:block" />
        <nav aria-label="Main" className="ml-auto hidden items-center lg:flex">
          {SITE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <span className="hidden md:block">
            <ThemeToggle />
          </span>
          <Link href={account.href} className="hidden min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg md:flex">
            <UserRound className="h-[1.1rem] w-[1.1rem]" aria-hidden /> {account.label}
          </Link>
          {!profile && (
            <Link href="/login/author" className="btn-primary ml-1 hidden min-h-10 px-4 text-sm md:inline-flex">
              Publish your book
            </Link>
          )}
          {profile && <NotificationBell userId={profile.id} className="h-11 w-11 text-fg hover:bg-surface-2" />}
          <Link href="/cart" className={icon} aria-label={inCart ? `Cart, ${inCart} ${inCart === 1 ? "copy" : "copies"}` : "Cart"}>
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {inCart > 0 && (
              <span className="absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.7rem] font-bold text-on-primary tabular-nums" aria-hidden>
                {inCart}
              </span>
            )}
          </Link>
          <Link href={account.href} className={`${icon} md:hidden`} aria-label={account.label}>
            <UserRound className="h-5 w-5" />
          </Link>
          <MobileMenu links={SITE_LINKS} account={account} showPublish={!profile} />
        </div>
      </div>
      <div className="container-x pb-3 md:hidden">
        <SearchBar id="q-mobile" />
      </div>
    </header>
  );
}
