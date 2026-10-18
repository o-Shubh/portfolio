import type { Metadata } from "next";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { LEGAL_LINKS } from "@/components/LegalPage";
import { FAQ } from "@/content/faq";

export const metadata: Metadata = {
  title: "Questions and answers",
  description: "How publishing, earnings, printing and delivery work at Eliphas Indicus Publications.",
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.flatMap((g) =>
      g.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    ),
  };

  const slug = (t: string) => t.toLowerCase().replace(/\W+/g, "-");

  return (
    <div className="pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="border-b border-line bg-surface-2/60">
        <div className="container-x py-10 text-center md:py-14">
          <p className="mono text-xs tracking-[0.06em] text-muted uppercase">Help</p>
          <h1 className="display mt-2 text-[2rem] md:text-[2.75rem]">Questions and answers</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">Everything about publishing, royalties, printing and delivery.</p>
          <nav aria-label="Topics" className="no-scrollbar -mx-4 mt-6 overflow-x-auto px-4">
            <ul className="segmented mx-auto w-max">
              {FAQ.map((g) => (
                <li key={g.title}>
                  <a href={`#${slug(g.title)}`} className="segment px-4 whitespace-nowrap">
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="container-x mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <div className="space-y-10">
          {FAQ.map((group) => (
            <section key={group.title} id={slug(group.title)} className="scroll-mt-24">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-xl">
                  <span className="h-2 w-2 rounded-full bg-primary dark:bg-accent-fg" aria-hidden />
                  {group.title}
                </h2>
                <span className="mono rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
                  {group.items.length} {group.items.length === 1 ? "answer" : "answers"}
                </span>
              </div>
              <div className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
                {group.items.map((f) => (
                  <details key={f.q} className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 px-4 py-3.5 font-medium hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                    </summary>
                    <p className="max-w-2xl px-4 pb-5 leading-relaxed text-fg/90 sm:px-5">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[18px] bg-primary p-5 text-on-primary">
            <h2 className="display text-xl text-on-primary">Still have a question?</h2>
            <p className="mt-1.5 text-sm text-on-primary/80">Write to us and a person on our team will reply.</p>
            <div className="mt-4 grid gap-2">
              <Link href="/contact" className="btn min-h-11 bg-white text-primary hover:bg-white/90">
                Contact us
              </Link>
              <Link href="/login/author?mode=signup" className="btn min-h-11 bg-white/10 text-on-primary hover:bg-white/15">
                Start publishing
              </Link>
            </div>
          </section>
          <nav aria-label="Policies" className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
            <h2 className="text-sm font-semibold">Policies</h2>
            <ul className="mt-1 divide-y divide-line text-sm">
              {LEGAL_LINKS.filter((l) => l.href !== "/contact").map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-11 items-center justify-between hover:text-accent-fg">
                    {l.label} <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
