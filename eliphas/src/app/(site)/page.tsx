import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { FAQ } from "@/content/faq";
import { coverUrl, listGenres, listPublishedBooks } from "@/lib/books";
import { earnings, printCost, rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

// Example used in the "what you earn" section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;

const STEPS = [
  { title: "Upload", text: "Add your book details, a print-ready PDF and your cover. Works on a phone or a laptop." },
  { title: "Review", text: "Our team checks every file for print quality and sends clear notes if anything needs a fix." },
  { title: "Go live", text: "Your book appears in the bookstore with its own page. Share the link anywhere." },
  { title: "Print and ship", text: "Each copy is printed when someone orders it and shipped to their door. You earn on every one." },
];

const FEATURES = [
  "Live sales, earnings and payouts",
  "See where your readers are",
  "Track every order to delivery",
  "Change price or details any time",
];

export default async function Home() {
  const [{ books }, genres, { rates, fees }] = await Promise.all([
    listPublishedBooks({ page: 1 }),
    listGenres(),
    getPricingSettings(),
  ]);
  const shelf = books.slice(0, 10);
  const heroBooks = books.slice(0, 3);
  const cost = printCost(EXAMPLE, rates);
  const example = cost === null ? null : earnings(EXAMPLE_MRP, cost, fees);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="container-x grid items-center gap-12 pt-12 pb-16 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1.5 text-sm text-muted">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">New</span>
            Print-on-demand publishing
          </p>
          <h1 className="mt-6 text-[3.1rem] leading-[0.98] tracking-[-0.035em] sm:text-7xl lg:text-[5.6rem]">
            Publish the book you were <em className="text-accent-fg">meant</em> to write.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
            Upload your manuscript, set your price and sell in print. Every copy is printed when a reader orders it — no
            stock, no upfront cost, and your rights stay yours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?next=/author" className="btn-primary min-h-12 px-6">
              Start publishing <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/books" className="btn-ghost min-h-12 px-6">
              Browse the bookstore
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {["Free to publish", "Keep your rights", "Earn on every copy"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-fg" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Bold brand moment: covers on an accent panel, with a live "sale" card */}
        <div className="relative" aria-hidden>
          <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-accent">
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {heroBooks.length === 3 &&
              heroBooks.map((b, i) => (
                <div
                  key={b.id}
                  className="absolute w-[30%]"
                  style={{
                    left: `${[12, 35, 58][i]}%`,
                    top: `${[20, 11, 22][i]}%`,
                    zIndex: [1, 3, 2][i],
                    transform: `rotate(${[-7, 0, 6][i]}deg)`,
                  }}
                >
                  <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} priority />
                </div>
              ))}
          </div>
          {example && heroBooks[0] && (
            <div className="absolute -bottom-6 left-4 w-64 rounded-xl bg-surface p-4 shadow-lift ring-1 ring-line sm:left-auto sm:-right-4 lg:-right-6">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> New order
                </span>
                <span>just now</span>
              </div>
              <p className="mt-2 truncate text-sm font-medium">{heroBooks[0].title}</p>
              <p className="mt-1 flex items-baseline justify-between">
                <span className="text-sm text-muted">Your earning</span>
                <span className="font-heading text-2xl tracking-tight text-success">+{rupees(example.authorEarning)}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Numbers ---------- */}
      <section className="border-y border-line">
        <dl className="container-x grid grid-cols-2 md:grid-cols-4">
          {[
            { k: "₹0", v: "to publish, ever" },
            { k: rupees(fees.platform_fee_per_copy), v: "flat fee per copy sold" },
            { k: "100%", v: "of your rights, kept" },
            { k: "0", v: "copies you need to stock" },
          ].map((s, i) => (
            <div key={s.v} className={`py-8 md:py-10 ${i % 2 ? "pl-6" : ""} ${i > 0 ? "md:border-l md:border-line md:pl-8" : ""} ${i === 1 ? "border-l border-line" : ""} ${i === 3 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line md:border-t-0" : ""}`}>
              <dt className="sr-only">{s.v}</dt>
              <dd className="font-heading text-4xl tracking-tight md:text-5xl">{s.k}</dd>
              <dd className="mt-1 text-sm text-muted">{s.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------- Bookstore ---------- */}
      {shelf.length > 0 && (
        <section className="container-x pt-20 md:pt-28">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">The bookstore</p>
              <h2 className="mt-3 text-4xl md:text-5xl">New releases</h2>
            </div>
            <Link href="/books" className="group flex shrink-0 items-center gap-1 text-[0.9375rem] font-medium">
              View all <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
          {genres.length > 0 && (
            <ul className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Browse by genre">
              {genres.map((g) => (
                <li key={g} className="shrink-0">
                  <Link
                    href={`/books?genre=${encodeURIComponent(g)}`}
                    className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm transition hover:border-fg"
                  >
                    {g}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8">
            <BookShelf books={shelf} />
          </div>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      <section className="container-x pt-24 md:pt-32">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-4xl md:text-5xl">From manuscript to doorstep.</h2>
            <p className="mt-4 max-w-sm text-muted">
              Four steps, no gatekeepers. Most books go from upload to live in a few days.
            </p>
          </div>
          <ol className="grid gap-x-8 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t border-line py-6">
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
                <h3 className="mt-3 text-2xl">{s.title}</h3>
                <p className="mt-2 text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Product ---------- */}
      <section className="container-x pt-24 md:pt-32">
        <div className="grid items-center gap-12 overflow-hidden rounded-2xl bg-surface-2 p-6 sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:p-14">
          <div>
            <p className="eyebrow">For authors</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Every copy, every reader, in one place.</h2>
            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fg text-bg">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login?next=/author" className="btn-primary mt-10">
              Create your author account
            </Link>
          </div>
          <DashboardMock />
        </div>
      </section>

      {/* ---------- Earnings (accent block) ---------- */}
      {example && (
        <section className="container-x pt-24 md:pt-32">
          <div className="grid gap-10 rounded-2xl bg-accent p-6 text-on-accent sm:p-10 lg:grid-cols-2 lg:items-center lg:p-14">
            <div>
              <p className="text-xs font-medium tracking-[0.12em] uppercase opacity-70">Transparent royalties</p>
              <h2 className="mt-3 text-4xl md:text-6xl">
                Know what you earn <em>before</em> you publish.
              </h2>
              <p className="mt-5 max-w-md text-lg opacity-80">
                You set the price. We take the print cost, a flat {rupees(fees.platform_fee_per_copy)} fee and payment
                charges. Everything else is yours.
              </p>
              <Link href="/pricing" className="btn mt-8 bg-ink text-paper hover:opacity-90">
                Open the calculator <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="rounded-xl bg-surface p-6 text-fg shadow-lift">
              <p className="text-sm text-muted">
                {EXAMPLE.page_count}-page paperback · 5 × 8 in · B&W · {rupees(EXAMPLE_MRP)}
              </p>
              <p className="mt-2 font-heading text-6xl tracking-tight">
                {rupees(example.authorEarning)}
                <span className="ml-2 font-sans text-base text-muted">per copy</span>
              </p>
              <div className="mt-6">
                <EarningsBreakdown e={example} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <section className="container-x grid gap-10 pt-24 md:pt-32 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 className="mt-3 text-4xl md:text-5xl">Before you begin</h2>
          <Link href="/faq" className="group mt-6 inline-flex items-center gap-1 font-medium">
            All questions <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        <div className="border-b border-line">
          {FAQ[0].items.slice(0, 5).map((f) => (
            <details key={f.q} className="group border-t border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium marker:hidden">
                {f.q}
                <span className="text-2xl leading-none font-light text-muted transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="-mt-1 max-w-2xl pb-6 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="container-x pt-24 md:pt-32">
        <div className="relative overflow-hidden rounded-2xl bg-ink px-6 py-16 text-center text-paper sm:py-24">
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
          <h2 className="relative mx-auto max-w-3xl text-5xl md:text-7xl">Your book, in readers&apos; hands.</h2>
          <p className="relative mx-auto mt-5 max-w-md text-paper/70">
            Create a free account with your mobile number. It takes about a minute.
          </p>
          <Link href="/login?next=/author" className="btn relative mt-10 min-h-12 bg-paper px-7 text-ink hover:opacity-90">
            Start publishing <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

/** A small, static picture of the author dashboard (decorative). */
function DashboardMock() {
  const bars = [18, 26, 22, 34, 30, 42, 38, 51, 47, 60, 56, 72];
  return (
    <div className="rounded-xl bg-surface shadow-lift ring-1 ring-line" aria-hidden>
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-xs text-muted">Dashboard</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: "Copies sold", v: "1,284" },
            { k: "Earned", v: "₹1.8L" },
            { k: "Due", v: "₹24,310" },
          ].map((t) => (
            <div key={t.k} className="rounded-lg border border-line p-3">
              <p className="text-[0.7rem] text-muted">{t.k}</p>
              <p className="mt-1 font-heading text-xl tracking-tight sm:text-2xl">{t.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Copies per month</span>
            <span className="text-success">+28%</span>
          </div>
          <div className="mt-4 flex h-28 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-[3px] bg-chart" style={{ height: `${h + 28}%`, opacity: i === bars.length - 1 ? 1 : 0.55 }} />
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { c: "Mumbai", n: 214 },
            { c: "Bengaluru", n: 188 },
            { c: "Delhi", n: 97 },
          ].map((r) => (
            <div key={r.c} className="flex items-center gap-3 text-xs">
              <span className="w-20 text-muted">{r.c}</span>
              <span className="h-1.5 rounded-full bg-fg/80" style={{ width: `${(r.n / 214) * 60}%` }} />
              <span className="tabular-nums">{r.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
