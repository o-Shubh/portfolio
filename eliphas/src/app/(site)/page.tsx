import { ArrowRight, BadgeIndianRupee, BookOpenCheck, FileUp, Languages, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { BookCard } from "@/components/BookCard";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { FAQ } from "@/content/faq";
import { coverUrl, listPublishedBooks } from "@/lib/books";
import { earnings, printCost, rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

// Example used in the "what you earn" section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;

const STEPS = [
  { icon: FileUp, title: "Upload", text: "Add your details, manuscript PDF and cover — from your phone or computer." },
  { icon: BookOpenCheck, title: "We review", text: "Our team checks print quality and sends clear notes if anything needs fixing." },
  { icon: PackageCheck, title: "Readers order", text: "Your book goes live in the bookstore. Share the link anywhere." },
  { icon: Truck, title: "We print and ship", text: "Each copy is printed in India and delivered. You earn on every copy." },
];

export default async function Home() {
  const [{ books }, { rates, fees }] = await Promise.all([listPublishedBooks({ page: 1 }), getPricingSettings()]);
  const featured = books.slice(0, 8);
  const heroBooks = books.slice(0, 3);
  const cost = printCost(EXAMPLE, rates);
  const example = cost === null ? null : earnings(EXAMPLE_MRP, cost, fees);

  return (
    <>
      {/* Hero */}
      <section className="px-3 pt-4">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink text-paper">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 right-[-30%] h-[22rem] w-[22rem] rounded-full bg-marigold/20 blur-3xl md:-top-32 md:right-[-10%] md:h-[28rem] md:w-[28rem] md:bg-marigold/30" />
            <div className="absolute bottom-[-30%] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-deodar/70 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
          </div>

          <div className="relative grid items-center gap-10 px-6 pt-12 pb-10 md:grid-cols-[1.15fr_1fr] md:px-12 md:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide ring-1 ring-white/15 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-marigold" /> Print on demand · Made for India
              </span>
              <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-semibold sm:text-6xl md:text-[4.2rem]">
                Your book, <span className="pr-[0.08em] text-marigold italic">printed</span> and delivered across India.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-paper/75">
                Publish in Hindi or English. No upfront cost, no stock to store — every copy is printed when a reader
                orders it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login?next=/author" className="btn-accent">
                  Publish your book <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/books" className="btn bg-white/10 text-paper ring-1 ring-white/20 backdrop-blur hover:bg-white/15">
                  Browse books
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {[
                  { k: "₹0", v: "to publish" },
                  { k: "2", v: "languages" },
                  { k: rupees(fees.platform_fee_per_copy), v: "flat fee per copy" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="sr-only">{s.v}</dt>
                    <dd className="font-heading text-2xl font-semibold md:text-3xl">{s.k}</dd>
                    <dd className="text-sm text-paper/60">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {heroBooks.length === 3 && (
              <div className="relative mx-auto h-72 w-full max-w-sm sm:h-80 md:h-[26rem]" aria-hidden>
                {heroBooks.map((b, i) => (
                  <div
                    key={b.id}
                    className="absolute w-[48%] drop-shadow-2xl"
                    style={{
                      left: `${[2, 26, 50][i]}%`,
                      top: `${[16, 2, 18][i]}%`,
                      zIndex: [1, 3, 2][i],
                      transform: `rotate(${[-9, 0, 8][i]}deg)`,
                    }}
                  >
                    <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} priority />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: BadgeIndianRupee, text: "₹0 to publish", sub: "Pay only when a copy sells" },
            { icon: Languages, text: "Hindi and English", sub: "Devanagari done right" },
            { icon: Truck, text: "Ships across India", sub: "Printed close to readers" },
            { icon: ShieldCheck, text: "You keep your rights", sub: "Change or take down anytime" },
          ].map((p) => (
            <li key={p.text} className="card flex items-start gap-3 p-4 md:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-marigold/15 text-[#8a5900] dark:text-marigold">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold leading-tight">{p.text}</span>
                <span className="mt-0.5 block text-sm text-muted">{p.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <span className="eyebrow">How it works</span>
        <h2 className="mt-3 max-w-xl text-3xl md:text-5xl">From manuscript to doorstep, in four steps.</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative overflow-hidden">
              <span aria-hidden className="absolute -top-4 -right-1 font-heading text-[6rem] leading-none font-semibold text-fg/[0.04]">
                {i + 1}
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-on-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-xl">
                <span className="text-muted">{i + 1}.</span> {s.title}
              </h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Earnings example */}
      {example && (
        <section className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 rounded-[2rem] bg-surface p-6 shadow-soft ring-1 ring-line md:grid-cols-2 md:items-center md:p-12">
            <div>
              <span className="eyebrow">Transparent pricing</span>
              <h2 className="mt-3 text-3xl md:text-5xl">Know what you earn, before you publish.</h2>
              <p className="mt-4 text-lg text-muted">
                You set the price. From each copy we take only the printing cost, a {rupees(fees.platform_fee_per_copy)}{" "}
                platform fee and the payment charges. Everything else is yours.
              </p>
              <Link href="/pricing" className="btn-ghost mt-8">
                Try the calculator <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="rounded-3xl bg-surface-2 p-6">
              <p className="text-sm font-semibold text-muted">
                {EXAMPLE.page_count}-page paperback · 5 × 8 in · B&W · MRP {rupees(EXAMPLE_MRP)}
              </p>
              <p className="mt-2 font-heading text-5xl font-semibold tracking-tight text-success">
                {rupees(example.authorEarning)}
                <span className="ml-2 font-sans text-base font-semibold text-muted">per copy to you</span>
              </p>
              <div className="mt-6">
                <EarningsBreakdown e={example} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New books */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl py-20">
          <div className="flex items-end justify-between gap-4 px-4">
            <div>
              <span className="eyebrow">Bookstore</span>
              <h2 className="mt-3 text-3xl md:text-5xl">New this month</h2>
            </div>
            <Link href="/books" className="btn-ghost shrink-0">
              See all <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {/* Swipe on phones, grid on larger screens */}
          <ul className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] lg:grid lg:grid-cols-4 lg:overflow-visible">
            {featured.map((b, i) => (
              <li key={b.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
                <BookCard book={b} priority={i < 4} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ teaser */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1fr_1.4fr]">
        <div>
          <span className="eyebrow">Questions</span>
          <h2 className="mt-3 text-3xl md:text-5xl">Authors often ask</h2>
          <Link href="/faq" className="btn-ghost mt-6">
            All questions <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="space-y-3">
          {FAQ[0].items.slice(0, 4).map((f) => (
            <details key={f.q} className="group card p-0 md:p-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold marker:hidden">
                {f.q}
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-lg transition group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="-mt-1 px-5 pb-5 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="px-3 pt-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-deodar px-6 py-16 text-center text-paper md:px-12">
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-marigold/30 blur-3xl" />
          <h2 className="relative mx-auto max-w-2xl text-3xl md:text-5xl">Ready to hold your book in your hands?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-paper/80">Sign up with your mobile number. It takes a minute, and it&apos;s free.</p>
          <Link href="/login?next=/author" className="btn-accent relative mt-8">
            Start publishing <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
