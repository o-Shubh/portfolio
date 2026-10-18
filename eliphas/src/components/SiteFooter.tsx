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
      { href: "/login/author?mode=signup", label: "Start publishing" },
      { href: "/pricing", label: "Pricing and royalties" },
      { href: "/faq", label: "Help and FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login?mode=signup", label: "Create an account" },
      { href: "/login", label: "Reader login" },
      { href: "/login/author", label: "Author login" },
      { href: "/account", label: "My orders" },
      { href: "/account/profile", label: "Profile" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/terms", label: "Terms of use" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/refunds", label: "Refunds and cancellations" },
      { href: "/community-guidelines", label: "Community guidelines" },
      { href: "/shipping", label: "Shipping and delivery" },
    ],
  },
];

const PROMISES = [
  { title: "Printed fresh for you", text: "Every copy printed after you order" },
  { title: "Delivered in 5–9 days", text: "Tracked shipping across India" },
  { title: "Secure payments", text: "UPI, cards and net banking by Razorpay" },
  { title: "Free cancellation", text: "Until printing starts" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 pb-14 md:pb-0">
      <div className="border-t border-line">
        <ul className="container-x grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
          {PROMISES.map((p) => (
            <li key={p.title}>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-0.5 text-xs text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-line bg-surface text-fg">
        <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo className="h-12" lazy />
            <p className="mt-4 max-w-xs text-sm text-muted">
              Self-publishing and print on demand. Your book, printed beautifully and delivered to readers.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h2 className="text-sm font-semibold">{c.title}</h2>
              <ul className="mt-3 space-y-0.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-10 items-center text-sm text-muted transition hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="safe-bottom border-t border-line">
          <div className="container-x flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-muted">
            <span>© {new Date().getFullYear()} Eliphas Indicus Publications</span>
            <span>Print on demand · No stock · No upfront cost</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
