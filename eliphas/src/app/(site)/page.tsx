import { ArrowRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BeforeAfter } from "@/components/BeforeAfter";
import { Book3D } from "@/components/Book3D";
import { BookShelf } from "@/components/BookCard";
import { BookCover, coverPalette } from "@/components/BookCover";
import { EditionIdStory } from "@/components/EditionIdStory";
import { Reveal } from "@/components/Reveal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getCurrentProfile } from "@/lib/auth";
import { authorHandle, BINDING_LABEL, coverUrl, LANGUAGE_LABEL, listGenres, listPublishedBooks } from "@/lib/books";
import { estimateCopy, formatPaise, ruleFromPlanVersion } from "@/lib/commission";
import { editionUrl } from "@/lib/eeid-format";
import { qrOrigin, qrSvg } from "@/lib/edition-qr";
import { getCurrentPlans } from "@/lib/plans";
import { gatewayPercent, printCost, rupees } from "@/lib/pricing";
import { SAMPLE_IMAGES, SAMPLE_LABEL } from "@/lib/service-portfolio";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// Example used in the author section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;


export default async function Home({ searchParams }: PageProps<"/">) {
  const { account } = await searchParams;
  const [{ books }, genres, { rates, fees }, plans, me] = await Promise.all([listPublishedBooks({ page: 1 }), listGenres(), getPricingSettings(), getCurrentPlans(), getCurrentProfile()]);
  const spotlight = books[0] ?? null;
  // Showcase order: one behind on the left, the newest in front, one behind on the right
  const showcase = books.length >= 3 ? [books[1], books[0], books[2]] : spotlight ? [spotlight] : [];
  const trio = showcase.length === 3;
  const hindi = books.filter((b) => b.language === "hi");
  const cost = printCost(EXAMPLE, rates);
  const example = cost === null ? null : estimateCopy(EXAMPLE_MRP * 100, cost * 100, ruleFromPlanVersion(plans.free), gatewayPercent(fees));
  // The Edition ID story uses a real edition when one exists
  const edition = books.find((b) => b.eeid) ?? null;

  const [handle, author, qr] = await Promise.all([
    spotlight ? authorHandle(spotlight.author_id) : null,
    spotlight ? createAdminClient().from("public_profiles").select("avatar_path, verified_author").eq("id", spotlight.author_id).maybeSingle().then((r) => r.data) : null,
    edition?.eeid ? qrSvg(editionUrl(qrOrigin().origin, edition.eeid)) : null,
  ]);
  const { format } = SAMPLE_IMAGES;

  return (
    <div className="space-y-20 pb-8 md:space-y-28">
      {account === "deleted" && (
        <div className="container-x pt-4">
          <p role="status" className="notice-info">
            Your account has been deleted. Thank you for reading with us.
          </p>
        </div>
      )}

      {/* ---------- Hero: headline and actions in HTML, the supplied artwork on an ivory panel (ivory in both themes) ---------- */}
      <section aria-labelledby="hero-h" className="container-x pt-4 md:pt-6">
        <div className="paper-panel relative overflow-hidden rounded-[24px]">
          <div className="hero-in relative z-10 px-6 pt-10 pb-2 sm:px-10 sm:pt-14 lg:absolute lg:top-0 lg:left-0 lg:w-[56%] lg:px-12 lg:pt-10 xl:px-14 xl:pt-14">
            <h1 id="hero-h" className="display text-[2.5rem] leading-[1.04] sm:text-6xl lg:text-5xl xl:text-[4rem]">
              Find your next great read.
            </h1>
            <p className="paper-muted mt-5 max-w-[30rem] text-lg sm:text-xl lg:mt-4 lg:text-lg">Discover independent voices in Hindi and English. Printed when you order. Delivered to your door.</p>
            <div className="mt-8 flex flex-wrap gap-3 lg:mt-6">
              <Link href="/books" className="btn-primary min-h-12 px-6 text-base">
                Explore books
              </Link>
              <Link href="/login/author?mode=signup" className="btn min-h-12 bg-black/[0.06] px-6 text-base text-[#1d1d1f] hover:bg-black/10">
                Publish your book
              </Link>
            </div>
          </div>
          <Image
            src="/graphics/eliphas-hero.webp"
            width={1536}
            height={1024}
            alt=""
            sizes="(min-width: 1180px) 1180px, 100vw"
            loading="eager"
            fetchPriority="high"
            className="hero-in-image art-fade-top h-auto w-full"
          />
        </div>
        {!me && (
          <p className="mt-4 text-center text-sm text-muted" data-testid="home-signup">
            New here?{" "}
            <Link href="/login?mode=signup" className="font-semibold text-accent-fg underline-offset-2 hover:underline">
              Create a free account
            </Link>{" "}
            to save books and follow authors.
          </p>
        )}
      </section>

      {/* ---------- Real featured books ---------- */}
      {spotlight && (
        <Reveal as="section" className="container-x">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16" data-book3d-zone>
            <div className={`relative mx-auto grid w-full max-w-[32rem] items-end px-2 pt-4 pb-10 ${trio ? "grid-cols-[1fr_1.45fr_1fr]" : "max-w-[15rem] grid-cols-1"}`}>
              {showcase.map((b, idx) => {
                const front = !trio || idx === 1;
                return (
                  <Link
                    key={b.id}
                    href={`/books/${b.slug}`}
                    aria-label={`${b.title} by ${b.author_name}`}
                    tabIndex={front ? undefined : -1}
                    className={`block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-focus ${front ? "z-10" : `z-0 -translate-y-[6%] ${idx === 0 ? "translate-x-[16%]" : "-translate-x-[16%]"}`}`}
                  >
                    <Book3D pages={b.page_count} spine={spineColour(b)} pose={idx === 0 && trio ? "spine" : "pages"} interactive={front}>
                      <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size={front ? "lg" : "md"} />
                    </Book3D>
                  </Link>
                );
              })}
            </div>
            <article aria-labelledby="spot-h" data-testid="spotlight">
              <p className="text-sm font-semibold text-marigold-fg">New in the bookstore</p>
              <h2 id="spot-h" className="display book-title mt-2 text-[2rem] sm:text-[2.75rem]" lang={spotlight.language}>
                <Link href={`/books/${spotlight.slug}`} className="hover:underline hover:underline-offset-4">
                  {spotlight.title}
                </Link>
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-muted">
                {handle ? (
                  <Link href={`/authors/${handle}`} className="font-medium text-fg hover:underline">
                    {spotlight.author_name}
                  </Link>
                ) : (
                  <span className="font-medium text-fg">{spotlight.author_name}</span>
                )}
                {author?.verified_author && <VerifiedBadge compact />}
                <span aria-hidden>·</span>
                <span>{[BINDING_LABEL[spotlight.binding] ?? spotlight.binding, LANGUAGE_LABEL[spotlight.language]].join(" · ")}</span>
              </p>
              {spotlight.description && (
                <p className="mt-5 line-clamp-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-fg/90" lang={spotlight.language}>
                  {spotlight.description}
                </p>
              )}
              <p className="mt-6 text-3xl font-semibold tabular-nums">{rupees(Number(spotlight.mrp))}</p>
              <p className="text-sm text-muted">Inclusive of all taxes · shipping shown at checkout</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/checkout/${spotlight.slug}`} className="btn-accent min-h-12 px-6 text-base">
                  Buy now
                </Link>
                <AddToCartButton bookId={spotlight.id} className="min-h-12 px-5 text-base" />
                {spotlight.sample_path && (
                  <Link href={`/books/${spotlight.slug}/sample`} className="btn-quiet min-h-12 text-base">
                    <BookOpen className="h-4 w-4" aria-hidden /> Read a sample
                  </Link>
                )}
              </div>
            </article>
          </div>
        </Reveal>
      )}

      {/* ---------- Shelves ---------- */}
      {books.length > 0 && (
        <Reveal as="section" className="container-x space-y-14">
          <Shelf title="New arrivals" note="Fresh from independent authors" href="/books" books={books.slice(0, 8)} />
          {hindi.length > 0 && <Shelf title="Hindi books" note="हिन्दी पुस्तकें" href="/books?lang=hi" books={hindi.slice(0, 8)} />}
          {genres.length > 0 && (
            <nav aria-label="Browse by category">
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                {genres.map((g) => (
                  <li key={g}>
                    <Link href={`/books?genre=${encodeURIComponent(g)}`} className="chip bg-surface">
                      {g}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/books?lang=hi" className="chip bg-surface" lang="hi">
                    हिन्दी पुस्तकें
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </Reveal>
      )}
      {books.length === 0 && (
        <section className="container-x text-center">
          <p className="display text-2xl">The first books are on their way.</p>
          <p className="mt-2 text-muted">Authors are preparing their books for print.</p>
        </section>
      )}

      {/* ---------- Publishing story ---------- */}
      <Reveal as="section" className="container-x">
        <div className="paper-panel overflow-hidden rounded-[24px] !bg-[#f8f4ee]" aria-labelledby="authors-h">
          <div className="grid items-center lg:grid-cols-[1fr_1.15fr]">
            <div className="px-6 pt-10 sm:px-10 lg:py-16 lg:pr-4 lg:pl-14">
              <p className="text-sm font-semibold text-[#8a5a00]">For authors</p>
              <h2 id="authors-h" className="display mt-2 text-[2rem] sm:text-5xl">
                Your words. Ready for the world.
              </h2>
              <p className="paper-muted mt-4 max-w-md text-lg">Bring your manuscript to life, from the first page to the finished book.</p>
              <ol className="mt-8 space-y-4">
                {[
                  ["Upload your manuscript and cover", "A print-ready PDF and a cover image."],
                  ["We check it is ready to print", "Our team reviews every book before it goes live."],
                  ["Readers order, we print and ship", "You earn on every copy. No stock, no upfront cost."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#17214A] text-sm font-semibold text-white tabular-nums">{i + 1}</span>
                    <span>
                      <span className="block font-semibold">{t}</span>
                      <span className="paper-muted block text-sm">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {example && (
                <p className="mt-8 text-sm">
                  <span className="paper-muted">
                    Example: a {EXAMPLE.page_count}-page paperback at {rupees(EXAMPLE_MRP)} earns you{" "}
                  </span>
                  <span className="text-lg font-semibold text-[#1d6b3a] tabular-nums">{formatPaise(example.authorEarningPaise)}</span>
                  <span className="paper-muted"> per copy, after printing ({formatPaise(example.printCostPaise)}), commission and GST ({formatPaise(example.commissionPaise + example.commissionGstPaise)}) and payment charges ({formatPaise(example.gatewayPaise)}).</span>
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login/author?mode=signup" className="btn min-h-12 bg-[#17214A] px-6 text-base text-white hover:opacity-90">
                  Publish your book
                </Link>
                <Link href="/pricing" className="btn min-h-12 bg-black/[0.06] px-6 text-base text-[#1d1d1f] hover:bg-black/10">
                  See pricing
                </Link>
              </div>
            </div>
            <Image src="/graphics/eliphas-publishing-journey.webp" width={1536} height={1024} alt="" sizes="(min-width: 1024px) 640px, 100vw" loading="lazy" className="art-fade h-auto w-full object-contain" />
          </div>
        </div>
      </Reveal>

      {/* ---------- Sample work: formatting before and after ---------- */}
      <Reveal as="section" className="container-x" aria-labelledby="samples-h">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="lg:order-2">
            <p className="text-sm font-semibold text-muted">Optional author services</p>
            <h2 id="samples-h" className="display mt-2 text-[2rem] sm:text-5xl">
              From manuscript to page.
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted">Drag the handle to compare a plain manuscript page with the same page professionally formatted for print.</p>
            <p className="mt-6 text-sm text-muted">
              Formatting and cover design are optional one-time services, quoted after we review your files.{" "}
              <Link href="/pricing" className="font-medium text-accent-fg hover:underline">
                See services and prices
              </Link>
            </p>
            <p className="mt-3 text-xs text-muted">{SAMPLE_LABEL}</p>
          </div>
          <div className="mx-auto w-full max-w-[22rem] lg:order-1">
            <BeforeAfter before={{ src: format.before.src, alt: format.before.alt }} after={{ src: format.chapter.src, alt: format.chapter.alt }} width={format.before.width} height={format.before.height} label="Formatting sample" />
          </div>
        </div>
      </Reveal>

      {/* ---------- Eliphas Edition ID ---------- */}
      <Reveal as="section" className="container-x" aria-labelledby="eeid-h">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-muted">Eliphas Edition ID</p>
          <h2 id="eeid-h" className="display mt-2 text-[2rem] sm:text-5xl">
            Every edition has its own page.
          </h2>
          <p className="mt-4 text-lg text-muted">
            Each approved edition gets an ID and a QR code on its label. Scan it to see that edition&apos;s format, ISBN and where to buy it.
          </p>
        </div>
        <div className="mt-12 rounded-[24px] bg-surface-2 px-6 py-10 sm:px-10">
          <EditionIdStory
            book={edition ? { title: edition.title, author_name: edition.author_name, slug: edition.slug, cover: coverUrl(edition.cover_path), eeid: edition.eeid, format: BINDING_LABEL[edition.binding] ?? edition.binding, language: edition.language } : spotlight ? { title: spotlight.title, author_name: spotlight.author_name, slug: spotlight.slug, cover: coverUrl(spotlight.cover_path), eeid: null, format: BINDING_LABEL[spotlight.binding] ?? spotlight.binding, language: spotlight.language } : null}
            qr={qr}
          />
        </div>
        <p className="mx-auto mt-5 max-w-2xl text-center text-xs text-muted">It&apos;s our own identifier, not an ISBN. Scanning the code doesn&apos;t confirm that a particular printed copy is genuine.</p>
      </Reveal>

      {/* ---------- Final invitation ---------- */}
      <Reveal as="section" className="container-x" aria-labelledby="final-h">
        <div className="text-center">
          <h2 id="final-h" className="display text-[2rem] sm:text-5xl">
            Your next chapter starts here.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/books" className="btn-primary min-h-12 px-6 text-base">
              Explore books <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/login/author?mode=signup" className="btn-tinted min-h-12 px-6 text-base">
              Publish your book
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Shelf({ title, note, href, books }: { title: string; note?: string; href: string; books: Parameters<typeof BookShelf>[0]["books"] }) {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="display text-[1.75rem] sm:text-4xl">{title}</h2>
          {note && <p className="mt-1 text-muted">{note}</p>}
        </div>
        <Link href={href} className="-mr-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent-fg">
          See all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <BookShelf books={books} />
    </div>
  );
}

/** Spine colour: the typographic cover's own colour, or navy for photographed covers. */
function spineColour(b: { slug: string; cover_path: string | null }) {
  return b.cover_path ? "#17214A" : coverPalette(b.slug).bg;
}
