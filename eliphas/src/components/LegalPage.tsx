import Link from "next/link";

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of use" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refunds", label: "Refunds and cancellations" },
  { href: "/shipping", label: "Shipping and delivery" },
  { href: "/contact", label: "Contact us" },
];

/** Shared layout for the policy pages: a title, the date, a side list of the other policies and readable prose. */
export function LegalPage({
  title,
  updated,
  path,
  children,
}: {
  title: string;
  updated: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-x py-12 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[1fr_2.2fr] lg:gap-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Policies</p>
          <h1 className="mt-4 text-3xl md:text-4xl">{title}</h1>
          <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
          <nav aria-label="Policies" className="mt-8 hidden lg:block">
            <ul className="space-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={l.href === path ? "page" : undefined}
                    className={l.href === path ? "font-medium text-fg" : "text-muted hover:text-fg"}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <article className="legal max-w-[68ch] min-w-0">{children}</article>
      </div>
    </div>
  );
}

/** A business detail, or a visible placeholder while the admin hasn't filled it in yet. */
export function Detail({ value, label }: { value: string; label: string }) {
  return value ? <>{value}</> : <span className="rounded bg-surface-2 px-1.5 text-muted">[{label} to be added]</span>;
}
