import { Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { cartBadgeCount } from "@/lib/cart";
import { HeaderNav } from "./HeaderNav";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

export const SITE_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/books", label: "Bookstore" },
  { href: "/community", label: "Community" },
  { href: "/articles", label: "Articles" },
  { href: "/authors", label: "Authors" },
  { href: "/pricing", label: "Publish a book" },
];

/** Search form used in the header. A plain GET form: works before JavaScript loads. */
function SearchBar({ id, className = "", placeholder = "Search books and authors" }: { id: string; className?: string; placeholder?: string }) {
  return (
    <form action="/books" role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search books
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        className="h-11 w-full rounded-[var(--radius-control)] border-0 bg-surface-2 pr-3 pl-9 text-[0.9375rem] text-fg outline-none placeholder:text-muted focus:bg-surface focus:shadow-[0_0_0_3px_rgb(74_99_201/0.25)] focus:ring-1 focus:ring-focus pointer-fine:h-9"
      />
    </form>
  );
}

/**
 * Site header: a translucent bar with the logo, the main sections as a segmented control, search,
 * notifications, cart and account. Phones get the logo, search, cart, account and a menu.
 */
export async function SiteHeader() {
  const [profile, inCart] = await Promise.all([getCurrentProfile(), cartBadgeCount()]);
  const account = profile ? { href: "/dashboard", label: "My account" } : { href: "/login", label: "Log in / Sign up" };
  const icon = "relative grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-surface-2";
  const initials = (profile?.full_name ?? "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="glass safe-top sticky top-0 z-30 border-b border-line text-fg supports-[not(backdrop-filter:blur(1px))]:bg-surface">
      <div className="container-x flex h-14 items-center gap-3 lg:gap-5">
        <Logo className="h-9 md:h-10" />
        <HeaderNav links={SITE_LINKS} />
        <SearchBar id="q-desktop" placeholder="Search" className="ml-auto hidden min-w-36 flex-1 md:block lg:max-w-56 xl:max-w-72" />
        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
          <span className="hidden xl:block">
            <ThemeToggle />
          </span>
          {profile && <NotificationBell userId={profile.id} className="h-11 w-11 text-fg hover:bg-surface-2" />}
          <Link href="/cart" className={icon} aria-label={inCart ? `Cart, ${inCart} ${inCart === 1 ? "copy" : "copies"}` : "Cart"}>
            <ShoppingBag className="h-5 w-5" aria-hidden />
            {inCart > 0 && (
              <span className="absolute top-1 right-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-buy px-1 text-[0.65rem] font-bold text-on-buy tabular-nums" aria-hidden>
                {inCart}
              </span>
            )}
          </Link>
          {profile ? (
            <Link href={account.href} className="hidden h-11 items-center gap-2 rounded-full pr-1 pl-1 md:flex" aria-label={account.label}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-on-primary" aria-hidden>
                {initials || <UserRound className="h-4 w-4" />}
              </span>
            </Link>
          ) : (
            <>
              <Link href={account.href} className="hidden min-h-11 items-center rounded-[var(--radius-control)] px-2.5 text-sm font-medium whitespace-nowrap text-muted hover:bg-surface-2 hover:text-fg md:flex pointer-fine:min-h-9">
                {account.label}
              </Link>
              <Link href="/login/author?mode=signup" className="btn-primary ml-1 hidden min-h-9 px-4 text-sm xl:inline-flex">
                Publish your book
              </Link>
            </>
          )}
          <Link href={account.href} className={`${icon} md:hidden`} aria-label={account.label}>
            <UserRound className="h-5 w-5" />
          </Link>
          <MobileMenu links={SITE_LINKS} account={account} showPublish={!profile} />
        </div>
      </div>
      <div className="container-x pb-2.5 md:hidden">
        <SearchBar id="q-mobile" />
      </div>
    </header>
  );
}
