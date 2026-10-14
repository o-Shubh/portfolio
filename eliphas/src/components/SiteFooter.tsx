import Link from "next/link";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-heading text-lg font-semibold">Eliphas Indicus Publications</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-paper/75">
            Print-on-demand publishing for Indian authors. Hindi and English. Printed in India, shipped across India.
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
      <div className="safe-bottom border-t border-paper/15">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-paper/60">
          © {new Date().getFullYear()} Eliphas Indicus Publications
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-marigold">{title}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-9 items-center text-paper/85 hover:text-paper">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
