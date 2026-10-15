import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Briefcase,
  ChefHat,
  Feather,
  Languages,
  Map as MapIcon,
  MessageCircle,
  PenLine,
  Search,
  Smile,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { coverUrl, listGenres, listPublishedBooks } from "@/lib/books";
import { estimateCopy, formatPaise, ruleFromPlanVersion } from "@/lib/commission";
import { getCurrentPlans } from "@/lib/plans";
import { gatewayPercent, printCost, rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

// Example used in the author banner. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;

// An icon and a soft colour for each genre tile; anything else gets the book icon.
const GENRE_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  Fiction: { icon: BookOpen, tint: "bg-[#e6ecf7] text-[#1d3157]" },
  Poetry: { icon: Feather, tint: "bg-[#f6ead3] text-[#8a5f17]" },
  Children: { icon: Smile, tint: "bg-[#e3f4ea] text-[#17643a]" },
  Cooking: { icon: ChefHat, tint: "bg-[#fbe4dc] text-[#9a3b1e]" },
  Business: { icon: Briefcase, tint: "bg-[#e5eef0] text-[#0f5e5c]" },
  Memoir: { icon: PenLine, tint: "bg-[#efe6f6] text-[#5b2c83]" },
  Travel: { icon: MapIcon, tint: "bg-[#e0f0fb] text-[#1b5f8f]" },
  Thriller: { icon: Search, tint: "bg-[#ebe7e4] text-[#4a3f38]" },
  "Self-help": { icon: Sparkles, tint: "bg-[#fdf1d6] text-[#8a5f17]" },
  Stories: { icon: MessageCircle, tint: "bg-[#f8e3e8] text-[#7a2e3a]" },
};
const DEFAULT_STYLE = { icon: BookMarked, tint: "bg-[#e6ecf7] text-[#1d3157]" };

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
    <div className="container-x space-y-8 pt-4 md:space-y-10 md:pt-6">
      {account === "deleted" && (
        <p role="status" className="rounded-xl bg-surface px-4 py-3 text-sm shadow-soft ring-1 ring-line">
          Your account has been deleted. Thank you for reading with us.
        </p>
      )}

      {/* ---------- Banners ---------- */}
      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-navy p-5 text-white sm:p-8 md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "18px 18px" }}
          />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Print on demand</p>
              <h1 className="mt-2 text-2xl leading-tight font-semibold sm:mt-3 sm:text-4xl md:text-[2.75rem]">
                Books printed fresh, just for you
              </h1>
              <p className="mt-3 hidden max-w-md text-white/75 sm:block">
                Discover independent authors. Every copy is printed after you order and delivered to your door.
              </p>
              <div className="mt-5 flex gap-2 sm:mt-6 sm:gap-3">
                <Link href="/books" className="btn-accent px-4 sm:px-5">
                  Shop books <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/login?next=/author" className="btn bg-white/10 px-4 text-white ring-1 ring-white/25 hover:bg-white/15 sm:px-5">
                  Publish a book
                </Link>
              </div>
            </div>
            {heroBooks.length === 3 && (
              <div className="relative mx-auto hidden h-56 w-full max-w-xs sm:block" aria-hidden>
                {heroBooks.map((b, i) => (
                  <div
                    key={b.id}
                    className="absolute w-[44%] drop-shadow-2xl"
                    style={{ left: `${[2, 28, 54][i]}%`, top: `${[14, 0, 16][i]}%`, zIndex: [1, 3, 2][i], transform: `rotate(${[-8, 0, 7][i]}deg)` }}
                  >
                    <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} priority />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link href="/books" className="flex items-center justify-between rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-navy sm:hidden">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4" aria-hidden /> Delivered across India · shipping shown before you pay
          </span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/books" className="group flex items-center justify-between gap-4 rounded-2xl bg-gold p-6 text-navy">
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4" aria-hidden /> Delivered across India
              </span>
              <span className="mt-1 block text-2xl font-semibold">Shipping shown by PIN code before you pay</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link href="/books?lang=hi" className="group flex items-center justify-between gap-4 rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-line">
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-accent-fg">
                <Languages className="h-4 w-4" aria-hidden /> Hindi and English
              </span>
              <span className="mt-1 block text-2xl font-semibold">Read in your language</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      {genres.length > 0 && (
        <section aria-labelledby="cat-heading" className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-line sm:p-6">
          <div className="flex items-center justify-between">
            <h2 id="cat-heading" className="text-lg sm:text-xl">
              Shop by category
            </h2>
            <Link href="/books" className="text-sm font-semibold text-accent-fg">
              View all
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-10">
            {genres.slice(0, 10).map((g) => {
              const s = GENRE_STYLE[g] ?? DEFAULT_STYLE;
              return (
                <li key={g}>
                  <Link href={`/books?genre=${encodeURIComponent(g)}`} className="group flex flex-col items-center gap-2 text-center">
                    <span className={`grid h-14 w-14 place-items-center rounded-2xl transition group-hover:-translate-y-0.5 sm:h-16 sm:w-16 ${s.tint}`}>
                      <s.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-xs font-medium sm:text-sm">{g}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------- Shelves ---------- */}
      {books.length > 0 && <Shelf title="New arrivals" href="/books" books={books.slice(0, 10)} />}
      {hindi.length > 0 && <Shelf title="Hindi books" href="/books?lang=hi" books={hindi.slice(0, 10)} />}
      {affordable.length > 0 && <Shelf title={`Under ${rupees(300)}`} href="/books" books={affordable.slice(0, 10)} />}

      {/* ---------- For authors ---------- */}
      <section className="overflow-hidden rounded-2xl bg-navy text-white">
        <div className="grid gap-8 p-6 sm:p-8 md:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">For authors</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Publish your book. Earn on every copy.</h2>
            <p className="mt-3 max-w-lg text-white/75">
              Free to publish, no stock to buy and you keep your rights. Upload your manuscript, set your price and we print
              and ship every order.
            </p>
            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Upload your book", "We check print quality", "Readers order, we deliver"].map((t, i) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold text-sm font-semibold text-navy">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login?next=/author" className="btn-accent">
                Start publishing <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/pricing" className="btn bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/15">
                See pricing
              </Link>
            </div>
          </div>
          {example && (
            <div className="rounded-xl bg-white p-6 text-navy">
              <p className="text-sm text-[#5b6478]">
                {EXAMPLE.page_count}-page paperback sold at {rupees(EXAMPLE_MRP)}
              </p>
              <p className="mt-1 text-4xl font-semibold text-[#15803d]">
                {formatPaise(example.authorEarningPaise)}
                <span className="ml-2 text-base font-medium text-[#5b6478]">to you per copy</span>
              </p>
              <dl className="mt-5 space-y-2 border-t border-[#13223c]/10 pt-4 text-sm">
                {[
                  ["Printing", example.printCostPaise],
                  ["Commission (Free plan)", example.commissionPaise],
                  ["GST on commission", example.commissionGstPaise],
                  ["Payment charges (estimate)", example.gatewayPaise],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[#5b6478]">
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

function Shelf({ title, href, books }: { title: string; href: string; books: Parameters<typeof BookShelf>[0]["books"] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl">{title}</h2>
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-accent-fg">
          View all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <BookShelf books={books} />
    </section>
  );
}
