import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <div className="container-x py-12 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Help</p>
          <h1 className="mt-4 text-5xl md:text-6xl">Questions and answers</h1>
          <p className="mt-4 max-w-sm text-muted">Everything about publishing, royalties, printing and delivery.</p>
          <nav aria-label="Topics" className="mt-8 hidden lg:block">
            <ul className="space-y-2">
              {FAQ.map((g) => (
                <li key={g.title}>
                  <a href={`#${g.title.toLowerCase().replace(/\W+/g, "-")}`} className="text-muted hover:text-fg">
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div>
          {FAQ.map((group) => (
            <section key={group.title} id={group.title.toLowerCase().replace(/\W+/g, "-")} className="mb-14 scroll-mt-24">
              <h2 className="text-3xl">{group.title}</h2>
              <div className="mt-4 border-b border-line">
                {group.items.map((f) => (
                  <details key={f.q} className="group border-t border-line">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium marker:hidden">
                      {f.q}
                      <span className="text-2xl leading-none font-light text-muted transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="-mt-1 max-w-2xl pb-6 leading-relaxed text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-col items-start gap-4 rounded-2xl bg-surface-2 p-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-heading text-3xl">Ready when you are.</p>
            <Link href="/login?next=/author" className="btn-primary">
              Start publishing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
