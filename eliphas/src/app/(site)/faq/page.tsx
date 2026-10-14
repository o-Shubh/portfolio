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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="text-3xl font-semibold md:text-4xl">Questions and answers</h1>

      {FAQ.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="text-2xl font-semibold">{group.title}</h2>
          <div className="mt-4 divide-y divide-line rounded-3xl bg-surface shadow-soft ring-1 ring-line">
            {group.items.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex justify-between gap-4">
                    {f.q}
                    <span className="text-xl leading-none text-marigold transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="card mt-12 text-center">
        <p className="font-heading text-xl font-semibold">Ready when you are.</p>
        <Link href="/login?next=/author" className="btn-accent mt-4">
          Start publishing
        </Link>
      </div>
    </div>
  );
}
