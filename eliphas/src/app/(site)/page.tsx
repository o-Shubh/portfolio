import { ArrowRight, Languages, Printer, Truck } from "lucide-react";
import Link from "next/link";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { coverUrl, listGenres, listPublishedBooks } from "@/lib/books";
import { estimateCopy, formatPaise, ruleFromPlanVersion } from "@/lib/commission";
import { getCurrentPlans } from "@/lib/plans";
import { gatewayPercent, printCost, rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

// Example used in the author section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;

const FACTS = [
  { icon: Printer, title: "Printed after you order", text: "Every copy is made fresh for you." },
  { icon: Truck, title: "Delivered across India", text: "Shipping for your PIN code is shown before you pay." },
  { icon: Languages, title: "Hindi and English", text: "Books by independent authors in both languages." },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { account } = await searchParams;
  const [{ books }, genres, { rates, fees }, plans] = await Promise.all([
    listPublishedBooks({ page: 1 }),
    listGenres(),
    getPricingSettings(),
    getCurrentPlans(),
  ]);
  const heroBooks = books.slice(0, 3);
  const hindi = books.filter((b) => b.language === "hi");
  const affordable = books.filter((b) => Number(b.mrp) < 300);
  const cost = printCost(EXAMPLE, rates);
  const example = cost === null ? null : estimateCopy(EXAMPLE_MRP * 100, cost * 100, ruleFromPlanVersion(plans.free), gatewayPercent(fees));

  return (
    <div className="container-x space-y-12 pt-6 pb-4 md:space-y-16 md:pt-10">
      {account === "deleted" && (
        <p role="status" className="notice bg-surface ring-line">
          Your account has been deleted. Thank you for reading with us.
        </p>
      )}

      {/* ---------- Hero: what this is, and the one thing to do ---------- */}
      <section className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="eyebrow">Eliphas Indicus Publications</p>
          <h1 className="mt-3 text-[2.1rem] leading-[1.12] sm:text-5xl md:text-[3.4rem]">Books by independent authors, printed fresh for you</h1>
          <p className="mt-4 max-w-lg text-lg text-muted">
            Discover new voices in Hindi and English. Every copy is printed after you order and delivered to your door.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/books" className="btn-accent">
              Browse books <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/login?next=/author" className="btn-ghost">
              Publish your book
            </Link>
          </div>
        </div>
        {heroBooks.length === 3 && (
          <div className="relative mx-auto hidden h-72 w-full max-w-sm md:block" aria-hidden>
            {heroBooks.map((b, i) => (
              <div
                key={b.id}
                className="absolute w-[42%]"
                style={{ left: `${[4, 29, 54][i]}%`, top: `${[10, 0, 12][i]}%`, zIndex: [1, 3, 2][i], transform: `rotate(${[-5, 0, 4][i]}deg)` }}
              >
                <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} priority />
              </div>
            ))}
          </div>
        )}
      </section>

      <ul className="grid gap-4 border-y border-line py-6 sm:grid-cols-3">
        {FACTS.map((f) => (
          <li key={f.title} className="flex gap-3">
            <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-fg" aria-hidden />
            <span>
              <span className="block font-semibold">{f.title}</span>
              <span className="text-sm text-muted">{f.text}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* ---------- Categories ---------- */}
      {genres.length > 0 && (
        <section aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="text-2xl">
            Browse by category
          </h2>
          <ul className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {genres.map((g) => (
              <li key={g}>
                <Link href={`/books?genre=${encodeURIComponent(g)}`} className="chip bg-surface">
                  {g}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/books?lang=hi" className="chip bg-surface">
                हिन्दी पुस्तकें
              </Link>
            </li>
          </ul>
        </section>
      )}

      {/* ---------- Shelves ---------- */}
      {books.length > 0 && <Shelf title="New arrivals" href="/books" books={books.slice(0, 10)} eager />}
      {hindi.length > 0 && <Shelf title="Hindi books" href="/books?lang=hi" books={hindi.slice(0, 10)} />}
      {affordable.length > 0 && <Shelf title={`Under ${rupees(300)}`} href="/books" books={affordable.slice(0, 10)} />}
      {books.length === 0 && (
        <section className="card text-center">
          <p className="text-lg font-semibold">The first books are on their way</p>
          <p className="mt-1 text-muted">Authors are preparing their books for print. Are you one of them?</p>
          <Link href="/login?next=/author" className="btn-primary mt-5">
            Publish your book
          </Link>
        </section>
      )}

      {/* ---------- For authors ---------- */}
      <section className="overflow-hidden rounded-[var(--radius-sheet)] bg-navy text-white">
        <div className="grid gap-8 p-6 sm:p-8 md:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-white/70">For authors</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Publish your book. Earn on every copy.</h2>
            <p className="mt-3 max-w-lg text-white/80">
              Free to publish, no stock to buy and you keep your rights. Upload your manuscript, set your price and we print and ship every order.
            </p>
            <ol className="mt-6 space-y-3">
              {["Upload your book and cover", "Our team checks it is ready to print", "Readers order; we print, ship and pay you"].map((t, i) => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold ring-1 ring-white/25">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login?next=/author" className="btn bg-white text-navy hover:bg-white/90">
                Start publishing <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/pricing" className="btn bg-transparent text-white ring-1 ring-white/30 ring-inset hover:bg-white/10">
                See pricing
              </Link>
            </div>
          </div>
          {example && (
            <div className="rounded-[var(--radius-card)] bg-white p-6 text-[#1d1d1f]">
              <p className="text-sm text-[#5f5f66]">
                Example: {EXAMPLE.page_count}-page paperback sold at {rupees(EXAMPLE_MRP)}
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-[#1b7a3d]">
                {formatPaise(example.authorEarningPaise)}
                <span className="ml-2 text-base font-medium text-[#5f5f66]">to you per copy</span>
              </p>
              <dl className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm">
                {[
                  ["Printing", example.printCostPaise],
                  ["Commission (Free plan)", example.commissionPaise],
                  ["GST on commission", example.commissionGstPaise],
                  ["Payment charges (estimate)", example.gatewayPaise],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[#5f5f66]">
                    <dt>{k}</dt>
                    <dd className="tabular-nums">− {formatPaise(Number(v))}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Shelf({ title, href, books, eager = false }: { title: string; href: string; books: Parameters<typeof BookShelf>[0]["books"]; eager?: boolean }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-2xl">{title}</h2>
        <Link href={href} className="-mr-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent-fg">
          View all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <BookShelf books={books} eager={eager} />
    </section>
  );
}
