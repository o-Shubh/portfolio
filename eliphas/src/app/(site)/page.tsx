import { BadgeIndianRupee, BookOpenCheck, FileUp, Languages, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { BookGrid } from "@/components/BookCard";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { FAQ } from "@/content/faq";
import { coverUrl, listPublishedBooks } from "@/lib/books";
import { earnings, printCost, rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

// Example used in the "what you earn" section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;

const STEPS = [
  { icon: FileUp, title: "Upload", text: "Add your book details, manuscript PDF and cover from your phone or computer." },
  { icon: BookOpenCheck, title: "We review", text: "Our team checks your files for print quality and sends notes if anything needs fixing." },
  { icon: PackageCheck, title: "Readers order", text: "Your book goes live in the bookstore. Share the link anywhere." },
  { icon: Truck, title: "We print and ship", text: "Each copy is printed in India and delivered to the reader. You earn on every copy." },
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
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 md:grid-cols-[1.2fr_1fr] md:pt-16">
        <div>
          <p className="font-semibold uppercase tracking-[0.2em] text-success">Print on demand · India</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">Your book, printed and delivered across India.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Publish in Hindi or English. No upfront cost and no stock to store — every copy is printed when a reader
            orders it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?next=/author" className="btn-accent">
              Publish your book
            </Link>
            <Link href="/books" className="btn-ghost">
              Browse books
            </Link>
          </div>
        </div>
        {heroBooks.length === 3 && (
          <div className="relative mx-auto h-72 w-full max-w-sm md:h-96" aria-hidden>
            {heroBooks.map((b, i) => (
              <div
                key={b.id}
                className="absolute w-[46%]"
                style={{
                  left: `${[4, 27, 50][i]}%`,
                  top: `${[14, 0, 14][i]}%`,
                  zIndex: [1, 3, 2][i],
                  transform: `rotate(${[-7, 0, 7][i]}deg)`,
                }}
              >
                <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} priority />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Promise strip */}
      <section className="border-y border-line bg-surface">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
          {[
            { icon: BadgeIndianRupee, text: "₹0 to publish" },
            { icon: Languages, text: "Hindi and English" },
            { icon: Truck, text: "Ships across India" },
            { icon: BookOpenCheck, text: "You keep your rights" },
          ].map((p) => (
            <li key={p.text} className="flex items-center gap-3 font-semibold">
              <p.icon className="h-6 w-6 shrink-0 text-marigold" aria-hidden />
              {p.text}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl font-semibold">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-marigold font-semibold text-on-marigold">
                  {i + 1}
                </span>
                <s.icon className="h-5 w-5 text-muted" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Earnings example */}
      {example && (
        <section className="bg-surface py-14">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold">Know what you earn, before you publish</h2>
              <p className="mt-3 text-lg text-muted">
                You set the price. From each copy we take only the printing cost, a {rupees(fees.platform_fee_per_copy)}{" "}
                platform fee and the payment charges. Everything else is yours.
              </p>
              <Link href="/pricing" className="btn-ghost mt-6">
                See pricing
              </Link>
            </div>
            <div className="card">
              <p className="text-sm font-semibold text-muted">
                Example: {EXAMPLE.page_count}-page paperback, 5 × 8 in, black & white, MRP {rupees(EXAMPLE_MRP)}
              </p>
              <div className="mt-4">
                <EarningsBreakdown e={example} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New books */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold">New in the bookstore</h2>
            <Link href="/books" className="shrink-0 font-semibold underline decoration-marigold decoration-2 underline-offset-4">
              See all
            </Link>
          </div>
          <div className="mt-8">
            <BookGrid books={featured} />
          </div>
        </section>
      )}

      {/* FAQ teaser */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="text-3xl font-semibold">Questions authors ask</h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ[0].items.slice(0, 3).map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="flex justify-between gap-4">
                  {f.q}
                  <span className="text-marigold transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="mt-4 inline-block font-semibold underline decoration-marigold decoration-2 underline-offset-4">
          All questions
        </Link>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-6xl px-4 pb-4 pt-6">
        <div className="rounded-3xl bg-deodar px-6 py-12 text-center text-paper md:px-12">
          <h2 className="text-3xl font-semibold md:text-4xl">Ready to hold your book in your hands?</h2>
          <p className="mx-auto mt-3 max-w-xl text-paper/85">
            Sign up with your mobile number. It takes a minute, and it&apos;s free.
          </p>
          <Link href="/login?next=/author" className="btn-accent mt-6">
            Start publishing
          </Link>
        </div>
      </section>
    </>
  );
}
