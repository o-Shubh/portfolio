import { Search, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { listGenres } from "@/lib/books";
import { cartBadgeCount } from "@/lib/cart";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

export const SITE_LINKS = [
  { href: "/books", label: "Bookstore" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "Help" },
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
        placeholder="Search books, authors, genres"
        className="h-11 w-full rounded-lg border-0 bg-white pr-12 pl-4 text-[0.9375rem] text-navy shadow-soft outline-none placeholder:text-[#6b7487] focus:ring-2 focus:ring-gold"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute top-1 right-1 bottom-1 grid w-10 place-items-center rounded-md bg-gold text-navy transition hover:brightness-105"
      >
        <Search className="h-[1.1rem] w-[1.1rem]" />
      </button>
    </form>
  );
}

/** Marketplace header: navy bar with logo and a big search box, and a genre strip on larger screens. */
export async function SiteHeader() {
  const [profile, genres, inCart] = await Promise.all([getCurrentProfile(), listGenres(), cartBadgeCount()]);
  const account = profile ? { href: "/dashboard", label: "My account" } : { href: "/login", label: "Log in" };

  return (
    <header className="safe-top sticky top-0 z-30 bg-bar text-white shadow-soft">
      <div className="container-x flex h-16 items-center gap-4 lg:gap-8">
        <Logo onDark className="h-10 md:h-12" />
        <SearchBar id="q-desktop" className="hidden max-w-2xl flex-1 md:block" />
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
          {SITE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <span className="hidden md:block [&_button]:text-white [&_button:hover]:bg-white/10">
            <ThemeToggle />
          </span>
          <Link
            href={account.href}
            className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 md:flex"
          >
            <UserRound className="h-[1.1rem] w-[1.1rem]" aria-hidden /> {account.label}
          </Link>
          {!profile && (
            <Link href="/login?next=/author" className="btn-accent hidden min-h-10 px-4 text-sm md:inline-flex">
              Publish your book
            </Link>
          )}
          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
            aria-label={inCart ? `Cart, ${inCart} ${inCart === 1 ? "copy" : "copies"}` : "Cart"}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {inCart > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.7rem] font-bold text-navy tabular-nums" aria-hidden>
                {inCart}
              </span>
            )}
          </Link>
          <Link href={account.href} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 md:hidden" aria-label={account.label}>
            <UserRound className="h-5 w-5" />
          </Link>
          <MobileMenu links={SITE_LINKS} account={account} showPublish={!profile} />
        </div>
      </div>
      <div className="container-x pb-3 md:hidden">
        <SearchBar id="q-mobile" />
      </div>
      {genres.length > 0 && (
        <nav aria-label="Genres" className="hidden border-t border-white/10 bg-navy-2/60 md:block dark:bg-white/5">
          <ul className="container-x no-scrollbar flex h-10 items-center gap-6 overflow-x-auto text-sm text-white/80">
            <li>
              <Link href="/books" className="font-medium text-white hover:text-gold">
                All books
              </Link>
            </li>
            {genres.map((g) => (
              <li key={g} className="shrink-0">
                <Link href={`/books?genre=${encodeURIComponent(g)}`} className="hover:text-gold">
                  {g}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link href="/books?lang=hi" className="hover:text-gold">
                Hindi books
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
