import Link from "next/link";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="px-3 pb-3">
      <div className="relative mx-auto mt-20 max-w-6xl overflow-hidden rounded-[2rem] bg-ink text-paper">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-marigold/25 blur-3xl"
        />
        <div className="relative grid gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark className="h-10 w-10" />
              <span className="font-heading text-xl font-semibold tracking-tight">Eliphas Indicus</span>
            </div>
            <p className="mt-4 max-w-xs text-paper/70">
              Print-on-demand publishing for Indian authors. Hindi and English. Printed in India, delivered across India.
            </p>
          </div>
          <FooterCol
            title="Readers"
            links={[
              { href: "/books", label: "Bookstore" },
              { href: "/books?lang=hi", label: "हिन्दी पुस्तकें" },
              { href: "/books?lang=en", label: "English books" },
            ]}
          />
          <FooterCol
            title="Authors"
            links={[
              { href: "/login?next=/author", label: "Start publishing" },
              { href: "/pricing", label: "Pricing and earnings" },
              { href: "/faq", label: "Questions" },
            ]}
          />
        </div>
        <div className="safe-bottom relative border-t border-white/10 px-6 py-5 text-sm text-paper/50 md:px-10">
          © {new Date().getFullYear()} Eliphas Indicus Publications
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="font-sans text-xs font-bold tracking-[0.16em] text-marigold uppercase">{title}</h2>
      <ul className="mt-4 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-9 items-center text-paper/80 transition hover:text-paper">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
