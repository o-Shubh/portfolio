import { ArrowRight, BadgeCheck, BookOpen, Heart, Languages, MessageCircle, Printer, QrCode, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getCurrentProfile } from "@/lib/auth";
import { authorHandle, coverUrl, LANGUAGE_LABEL, listGenres, listPublishedBooks } from "@/lib/books";
import { estimateCopy, formatPaise, ruleFromPlanVersion } from "@/lib/commission";
import { editionUrl } from "@/lib/eeid-format";
import { qrOrigin, qrSvg } from "@/lib/edition-qr";
import { getCurrentPlans } from "@/lib/plans";
import { listPosts } from "@/lib/posts";
import { gatewayPercent, printCost, rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// Example used in the author section. Prices come from the settings table.
const EXAMPLE = { page_count: 200, trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const EXAMPLE_MRP = 299;

const HOW = [
  { icon: Printer, title: "Printed after you order", text: "Every copy is made fresh for you, so no book is ever out of stock." },
  { icon: Truck, title: "Delivered across India", text: "The shipping charge for your PIN code is shown before you pay." },
  { icon: Languages, title: "Hindi and English", text: "Books by independent authors in both languages." },
  { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards and net banking through Razorpay. Free cancellation until printing starts." },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { account } = await searchParams;
  const [{ books }, genres, { rates, fees }, plans, me, { posts }] = await Promise.all([
    listPublishedBooks({ page: 1 }),
    listGenres(),
    getPricingSettings(),
    getCurrentPlans(),
    getCurrentProfile(),
    listPosts({ mode: "discover" }),
  ]);
  const spotlight = books[0] ?? null;
  const hindi = books.filter((b) => b.language === "hi");
  const affordable = books.filter((b) => Number(b.mrp) < 300);
  const cost = printCost(EXAMPLE, rates);
  const example = cost === null ? null : estimateCopy(EXAMPLE_MRP * 100, cost * 100, ruleFromPlanVersion(plans.free), gatewayPercent(fees));

  // Spotlight details (all real): author link and verification, and the edition's QR when it has an EEID
  const [handle, author] = spotlight
    ? await Promise.all([
        authorHandle(spotlight.author_id),
        createAdminClient().from("public_profiles").select("avatar_path, verified_author").eq("id", spotlight.author_id).maybeSingle().then((r) => r.data),
      ])
    : [null, null];
  const qr = spotlight?.eeid ? await qrSvg(editionUrl(qrOrigin().origin, spotlight.eeid)) : null;

  return (
    <div className="container-x space-y-12 pt-6 pb-4 md:space-y-16 md:pt-10">
      {account === "deleted" && (
        <p role="status" className="notice bg-surface ring-line">
          Your account has been deleted. Thank you for reading with us.
        </p>
      )}

      {/* ---------- Hero: what this is, then the newest book in the spotlight ---------- */}
      <section aria-labelledby="hero-h" className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-tint-warn text-marigold-fg ring-1 ring-marigold/30 ring-inset">Printed on demand</span>
          <span className="mono text-xs text-muted">Hindi · English · Delivered across India</span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div>
            <h1 id="hero-h" className="display text-[2.1rem] sm:text-5xl md:text-[3.25rem]">
              Books by independent authors, printed fresh for you
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">Discover new voices in Hindi and English. Every copy is printed after you order and delivered to your door.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/books" className="btn-primary">
              Browse books <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/login/author?mode=signup" className="btn-tinted">
              Publish your book
            </Link>
          </div>
        </div>
        {!me && (
          <p className="text-sm text-muted" data-testid="home-signup">
            New here?{" "}
            <Link href="/login?mode=signup" className="font-semibold text-accent-fg hover:underline">
              Create a free account
            </Link>{" "}
            to save books, follow authors and join the community.
          </p>
        )}

        {spotlight && (
          <article className="grid overflow-hidden rounded-[var(--radius-sheet)] bg-surface ring-1 ring-line shadow-soft md:grid-cols-[1.35fr_1fr]" aria-labelledby="spot-h" data-testid="spotlight">
            <div className="order-2 flex flex-col p-6 sm:p-8 md:order-1 md:p-10">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-marigold-fg uppercase">New in the bookstore</p>
                <span className="text-xs text-muted">
                  {[spotlight.genre, LANGUAGE_LABEL[spotlight.language]].filter(Boolean).join(" · ")}
                </span>
                {spotlight.eeid && (
                  <Link href={`/e/${spotlight.eeid}`} className="mono rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem] text-muted hover:text-fg">
                    {spotlight.eeid}
                  </Link>
                )}
              </div>
              <h2 id="spot-h" className="display mt-4 text-3xl sm:text-4xl md:text-[2.6rem]" lang={spotlight.language}>
                <Link href={`/books/${spotlight.slug}`} className="hover:underline hover:underline-offset-4">
                  {spotlight.title}
                </Link>
              </h2>
              {spotlight.subtitle && <p className="mt-2 font-serif text-lg text-muted italic">{spotlight.subtitle}</p>}
              <div className="mt-5 flex items-center gap-3">
                <AuthorAvatar name={spotlight.author_name} path={author?.avatar_path ?? null} size="sm" />
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {handle ? (
                    <Link href={`/authors/${handle}`} className="font-semibold hover:underline">
                      {spotlight.author_name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{spotlight.author_name}</span>
                  )}
                  {author?.verified_author && <VerifiedBadge compact />}
                </span>
              </div>
              {spotlight.description && (
                <p className="mt-5 line-clamp-4 max-w-[60ch] font-serif text-[1.0625rem] leading-relaxed text-fg/85" lang={spotlight.language}>
                  {spotlight.description}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="mono text-2xl font-medium">{rupees(Number(spotlight.mrp))}</p>
                <p className="text-xs text-muted">Inclusive of all taxes</p>
                {spotlight.isbn && <p className="mono text-xs text-muted">ISBN {spotlight.isbn}</p>}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/checkout/${spotlight.slug}`} className="btn-accent">
                  Buy now
                </Link>
                {spotlight.sample_path ? (
                  <Link href={`/books/${spotlight.slug}/sample`} className="btn-tinted">
                    <BookOpen className="h-4 w-4" aria-hidden /> Read free sample
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center px-1 text-sm text-muted">Sample coming soon</span>
                )}
                <AddToCartButton bookId={spotlight.id} />
              </div>
            </div>
            <div className="order-1 grid place-items-center bg-ivory px-12 py-8 md:order-2 md:px-14 md:py-10">
              <div className="w-full max-w-[10rem] sm:max-w-[13rem] md:max-w-[15rem]">
                <BookCover title={spotlight.title} author={spotlight.author_name} slug={spotlight.slug} src={coverUrl(spotlight.cover_path)} priority />
              </div>
            </div>
          </article>
        )}
      </section>

      {/* ---------- Categories ---------- */}
      {genres.length > 0 && (
        <section aria-labelledby="cat-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="cat-heading" className="text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
              Browse by category
            </h2>
            <span className="mono text-xs text-marigold-fg">{genres.length} genres</span>
          </div>
          <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <li>
              <Link href="/books" className="chip bg-primary text-on-primary ring-primary">
                All books
              </Link>
            </li>
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
        </section>
      )}

      {/* ---------- Shelves ---------- */}
      {books.length > 0 && <Shelf title="New arrivals" note="Fresh from independent authors" href="/books" books={books.slice(0, 10)} eager />}
      {hindi.length > 0 && <Shelf title="Hindi books" note="हिन्दी पुस्तकें" href="/books?lang=hi" books={hindi.slice(0, 10)} />}
      {affordable.length > 0 && <Shelf title={`Under ${rupees(300)}`} href="/books" books={affordable.slice(0, 10)} />}
      {books.length === 0 && (
        <section className="card text-center">
          <p className="text-lg font-semibold">The first books are on their way</p>
          <p className="mt-1 text-muted">Authors are preparing their books for print. Are you one of them?</p>
          <Link href="/login/author?mode=signup" className="btn-primary mt-5">
            Publish your book
          </Link>
        </section>
      )}

      {/* ---------- Eliphas Edition IDs (accurate: an identifier and a page, not proof of authenticity) ---------- */}
      <section aria-labelledby="eeid-h" className="overflow-hidden rounded-[var(--radius-sheet)] bg-navy text-white">
        <div className="grid gap-8 p-6 sm:p-8 md:p-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.08em] text-[#f2b544] uppercase">
              <QrCode className="h-4 w-4" aria-hidden /> Eliphas Edition ID
            </p>
            <h2 id="eeid-h" className="display mt-3 text-3xl sm:text-4xl">
              Every edition has its own ID and page
            </h2>
            <p className="mt-3 max-w-xl text-white/80">
              Each approved edition and format gets a permanent Eliphas Edition ID, like EEID-2026-000123, and a QR code that opens its public page:
              cover, format, language, a free sample and where to buy.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["A permanent page", "The address never changes, even if the price does."],
                ["One code per edition", "Paperback, hardcover and new editions each get their own."],
                ["Separate from ISBN", "It's our own identifier. It doesn't prove a copy is genuine."],
              ].map(([t, d]) => (
                <li key={t} className="rounded-[var(--radius-card)] bg-white/[0.06] p-4 ring-1 ring-white/10">
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="mt-1 text-xs text-white/70">{d}</p>
                </li>
              ))}
            </ul>
          </div>
          {spotlight?.eeid && qr ? (
            <Link href={`/e/${spotlight.eeid}`} className="mx-auto block w-full max-w-[16rem] rounded-[var(--radius-card)] bg-white p-4 text-[#1d1d1f] shadow-sheet">
              <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-[#62626a] uppercase">Scan to explore this book</p>
              <div className="mt-2 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`QR code for ${spotlight.title}`} dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="mono mt-2 text-center text-sm font-medium">{spotlight.eeid}</p>
            </Link>
          ) : (
            <div className="mx-auto grid w-full max-w-[16rem] place-items-center rounded-[var(--radius-card)] bg-white/[0.06] p-8 text-center ring-1 ring-white/10">
              <QrCode className="h-16 w-16 text-white/70" aria-hidden />
              <p className="mt-3 text-sm text-white/80">Edition IDs appear on books as they are approved.</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Community ---------- */}
      {posts.length > 0 && (
        <section aria-labelledby="comm-h">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-marigold-fg uppercase">Community</p>
              <h2 id="comm-h" className="display mt-1 text-2xl sm:text-3xl">
                Readers and authors talking books
              </h2>
            </div>
            <Link href="/community" className="-mr-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent-fg">
              Open Community <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {posts.slice(0, 2).map((p) => {
              return (
                <li key={p.id} className="relative flex flex-col rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line shadow-soft">
                  <div className="flex items-center gap-3">
                    <AuthorAvatar name={p.author?.full_name ?? "Member"} path={p.author?.avatar_path ?? null} size="sm" />
                    <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-semibold">{p.author?.full_name ?? "Member"}</span>
                      {p.author?.verified_author_at && <BadgeCheck className="h-4 w-4 text-accent-fg" aria-label="Verified author" />}
                      {p.published_at && (
                        <span className="text-muted">
                          · {new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="mt-3 line-clamp-4 break-words text-[0.9375rem] whitespace-pre-line">{p.body}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm text-muted">
                    <span className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Heart className="h-4 w-4" aria-hidden /> {p.likes}
                        <span className="sr-only">likes</span>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <MessageCircle className="h-4 w-4" aria-hidden /> {p.comments}
                        <span className="sr-only">comments</span>
                      </span>
                    </span>
                    <Link href={`/community/${p.id}`} className="font-semibold text-accent-fg after:absolute after:inset-0 after:content-['']">
                      Read post<span className="sr-only"> by {p.author?.full_name ?? "a member"}</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------- How it works: settings-style grouped list ---------- */}
      <section aria-labelledby="how-h">
        <h2 id="how-h" className="mb-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
          How Eliphas works
        </h2>
        <ul className="group-list">
          {HOW.map((f) => (
            <li key={f.title} className="group-row py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-surface-2 text-primary dark:text-accent-fg">
                <f.icon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold">{f.title}</span>
                <span className="block text-sm text-muted">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- For authors ---------- */}
      <section aria-labelledby="authors-h" className="grid gap-6 overflow-hidden rounded-[var(--radius-sheet)] bg-surface p-6 ring-1 ring-line shadow-soft sm:p-8 md:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-marigold-fg uppercase">For authors</p>
          <h2 id="authors-h" className="display mt-2 text-3xl sm:text-4xl">
            Publish your book. Earn on every copy.
          </h2>
          <p className="mt-3 max-w-lg text-muted">
            Free to publish, no stock to buy and you keep your rights. Upload your manuscript, set your price and we print and ship every order.
          </p>
          <ol className="mt-6 space-y-3">
            {["Upload your book and cover", "Our team checks it is ready to print", "Readers order; we print, ship and pay you"].map((t, i) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-medium">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login/author?mode=signup" className="btn-primary">
              Start publishing <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/pricing" className="btn-ghost">
              See pricing
            </Link>
          </div>
        </div>
        {example && (
          <div className="rounded-[var(--radius-card)] bg-surface-2 p-6">
            <p className="text-sm text-muted">
              Example: {EXAMPLE.page_count}-page paperback sold at {rupees(EXAMPLE_MRP)}
            </p>
            <p className="mono mt-1 text-4xl font-medium text-success">
              {formatPaise(example.authorEarningPaise)}
              <span className="ml-2 font-sans text-base font-medium text-muted">to you per copy</span>
            </p>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              {[
                ["Printing", example.printCostPaise],
                ["Commission (Free plan)", example.commissionPaise],
                ["GST on commission", example.commissionGstPaise],
                ["Payment charges (estimate)", example.gatewayPaise],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-muted">
                  <dt>{k}</dt>
                  <dd className="mono">− {formatPaise(Number(v))}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}

function Shelf({ title, note, href, books, eager = false }: { title: string; note?: string; href: string; books: Parameters<typeof BookShelf>[0]["books"]; eager?: boolean }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="display text-2xl sm:text-3xl">{title}</h2>
          {note && <p className="mt-1 text-sm text-muted">{note}</p>}
        </div>
        <Link href={href} className="-mr-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent-fg">
          View all <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <BookShelf books={books} eager={eager} />
    </section>
  );
}
