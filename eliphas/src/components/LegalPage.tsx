import Link from "next/link";
import { PrintButton } from "./PrintButton";

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of use" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refunds", label: "Refunds and cancellations" },
  { href: "/shipping", label: "Shipping and delivery" },
  { href: "/community-guidelines", label: "Community guidelines" },
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
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted print:hidden">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">Policies</span>
      </nav>
      <header className="mt-2 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mono text-xs tracking-[0.06em] text-muted uppercase">Eliphas Indicus Publications</p>
          <h1 className="display mt-1.5 text-[1.875rem] md:text-[2.5rem]">{title}</h1>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
            Last updated <span className="mono text-fg">{updated}</span>
          </p>
        </div>
        <PrintButton />
      </header>
      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start print:hidden">
          <nav aria-label="Policies">
            <p className="mb-2 text-xs font-semibold tracking-[0.06em] text-muted uppercase">Policies</p>
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-0.5 lg:px-0">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href} className="shrink-0">
                  <Link
                    href={l.href}
                    aria-current={l.href === path ? "page" : undefined}
                    className="chip bg-surface lg:flex lg:min-h-9 lg:rounded-[var(--radius-control)] lg:bg-transparent lg:ring-0 lg:aria-[current=page]:bg-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-6 hidden text-xs text-muted lg:block">
            Questions about a policy?{" "}
            <Link href="/contact" className="text-accent-fg underline-offset-2 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </aside>
        <article className="legal min-w-0 rounded-[18px] bg-surface px-5 py-6 ring-1 ring-line sm:px-10 sm:py-10 print:p-0 print:ring-0">
          <div className="max-w-[68ch]">{children}</div>
        </article>
      </div>
    </div>
  );
}

/** A business detail, or a visible placeholder while the admin hasn't filled it in yet. */
export function Detail({ value, label }: { value: string; label: string }) {
  return value ? <>{value}</> : <span className="rounded bg-surface-2 px-1.5 text-muted">[{label} to be added]</span>;
}
