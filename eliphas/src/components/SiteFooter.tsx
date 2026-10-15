import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Read",
    links: [
      { href: "/books", label: "Bookstore" },
      { href: "/books?lang=en", label: "English books" },
      { href: "/books?lang=hi", label: "Hindi books" },
    ],
  },
  {
    title: "Publish",
    links: [
      { href: "/login?next=/author", label: "Start publishing" },
      { href: "/pricing", label: "Pricing and royalties" },
      { href: "/faq", label: "Help and FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/account", label: "My orders" },
      { href: "/account/profile", label: "Profile" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs font-heading text-2xl leading-snug tracking-tight">
            Independent publishing, printed beautifully.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h2 className="font-sans text-sm font-medium text-fg">{c.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[0.9375rem] text-muted transition hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="safe-bottom border-t border-line">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} Eliphas Indicus Publications</span>
          <span>Print on demand · No stock · No upfront cost</span>
        </div>
      </div>
    </footer>
  );
}
