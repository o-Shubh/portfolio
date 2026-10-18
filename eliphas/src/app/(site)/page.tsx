import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AppleBookShowcase from "@/components/AppleBookShowcase";
import { BeforeAfter } from "@/components/BeforeAfter";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { EditionIdStory } from "@/components/EditionIdStory";
import { Reveal } from "@/components/Reveal";
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

const FEATURED_SLUG = "monsoon-letters";

// Example used in the author section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;


export default async function Home({ searchParams }: PageProps<"/">) {
  const { account } = await searchParams;
  const [{ books }, genres, { rates, fees }, plans, me] = await Promise.all([listPublishedBooks({ page: 1 }), listGenres(), getPricingSettings(), getCurrentPlans(), getCurrentProfile()]);
  // The featured book: Monsoon Letters while it's in the catalogue, otherwise the newest book
  const featured = books.find((b) => b.slug === FEATURED_SLUG) ?? books[0] ?? null;
  const label = (group: Record<string, { label: string }>, key: string) => group[key]?.label ?? key;
  const hindi = books.filter((b) => b.language === "hi");
  const cost = printCost(EXAMPLE, rates);
  const example = cost === null ? null : estimateCopy(EXAMPLE_MRP * 100, cost * 100, ruleFromPlanVersion(plans.free), gatewayPercent(fees));
  // The Edition ID story uses a real edition when one exists
  const edition = books.find((b) => b.eeid) ?? null;

  const admin = createAdminClient();
  const [handle, siblings, qr] = await Promise.all([
    featured ? authorHandle(featured.author_id) : null,
    // Other published editions of the same work (e.g. a hardcover), for the edition selector
    featured
      ? admin
          .from("books")
          .select("work_id")
          .eq("id", featured.id)
          .maybeSingle()
          .then(async ({ data }) =>
            data?.work_id ? ((await admin.from("books").select("slug, binding, mrp, edition_label").eq("work_id", data.work_id).eq("status", "published").order("mrp")).data ?? []) : [],
          )
      : [],
    edition?.eeid ? qrSvg(editionUrl(qrOrigin().origin, edition.eeid)) : null,
  ]);
  const editions = (siblings.length ? siblings : featured ? [featured] : []).map((e) => ({
    slug: e.slug,
    label: [label(rates.binding, e.binding), e.edition_label].filter(Boolean).join(" · "),
    price: rupees(Number(e.mrp)),
  }));
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

      {/* ---------- Product stage: the featured book, its real editions and how it's made ---------- */}
      {featured ? (
        <AppleBookShowcase
          book={{
            slug: featured.slug,
            title: featured.title,
            subtitle: featured.subtitle,
            author: featured.author_name,
            authorHref: handle ? `/authors/${handle}` : null,
            description: featured.description,
            language: featured.language,
            meta: [featured.genre, LANGUAGE_LABEL[featured.language]].filter(Boolean).join(" · "),
            pages: featured.page_count,
            sample: Boolean(featured.sample_path),
            specs: {
              paper: label(rates.paper, featured.paper),
              binding: label(rates.binding, featured.binding),
              interior: label(rates.interior, featured.interior),
              size: label(rates.trim_sizes, featured.trim_size),
            },
          }}
          editions={editions}
          cover={<BookCover title={featured.title} author={featured.author_name} slug={featured.slug} src={coverUrl(featured.cover_path)} size="lg" priority />}
          signup={
            !me && (
              <p className="mt-6 text-sm text-neutral-400" data-testid="home-signup">
                New here?{" "}
                <Link href="/login?mode=signup" className="font-semibold text-amber-300 underline-offset-2 hover:underline">
                  Create a free account
                </Link>{" "}
                to save books and follow authors.
              </p>
            )
          }
        />
      ) : (
        <section className="container-x pt-10 text-center">
          <h1 className="display text-4xl">Literature, engineered for the senses.</h1>
          <p className="mt-3 text-muted">The first books are on their way.</p>
        </section>
      )}

      {/* ---------- Shelves ---------- */}
      {books.length > 0 && (
        <Reveal as="section" className="container-x space-y-14">
          <Shelf title="New arrivals" note="Fresh from independent authors" href="/books" books={books.slice(0, 8)} />
          {hindi.length > 0 && <Shelf title="Hindi books" note="Independent voices in Hindi" href="/books?lang=hi" books={hindi.slice(0, 8)} />}
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
                  <Link href="/books?lang=hi" className="chip bg-surface">
                    Hindi books
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
            book={edition ? { title: edition.title, author_name: edition.author_name, slug: edition.slug, cover: coverUrl(edition.cover_path), eeid: edition.eeid, format: BINDING_LABEL[edition.binding] ?? edition.binding, language: edition.language } : featured ? { title: featured.title, author_name: featured.author_name, slug: featured.slug, cover: coverUrl(featured.cover_path), eeid: null, format: BINDING_LABEL[featured.binding] ?? featured.binding, language: featured.language } : null}
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
