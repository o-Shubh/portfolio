import { BookOpen, PackageCheck, Printer, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { createAdminClient } from "@/lib/supabase/admin";
import { FollowButton } from "@/components/articles/FollowButton";
import { BookReviews } from "@/components/reviews/BookReviews";
import { readerState } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth";
import { listReviews } from "@/lib/reviews";
import { notFound } from "next/navigation";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { authorHandle, coverUrl, getPublishedBook, LANGUAGE_LABEL, moreByAuthor } from "@/lib/books";
import { rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/books/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getPublishedBook(slug);
  if (!book) return { title: "Book not found" };
  const cover = coverUrl(book.cover_path);
  return {
    title: `${book.title} by ${book.author_name}`,
    description: book.description?.slice(0, 160) ?? undefined,
    openGraph: { title: book.title, description: book.description ?? undefined, images: cover ? [cover] : undefined },
  };
}

export default async function BookPage({ params }: PageProps<"/books/[slug]">) {
  const { slug } = await params;
  const book = await getPublishedBook(slug);
  if (!book) notFound();

  const [more, { rates }, handle, me, { reviews, average, counts }, author] = await Promise.all([
    moreByAuthor(book),
    getPricingSettings(),
    authorHandle(book.author_id),
    getCurrentProfile(),
    listReviews(book.id),
    createAdminClient().from("public_profiles").select("avatar_path, bio, verified_author").eq("id", book.author_id).maybeSingle().then((r) => r.data),
  ]);
  const following = me ? (await readerState(me.id, "00000000-0000-0000-0000-000000000000", book.author_id)).following : false;
  const isAuthor = me?.id === book.author_id;
  const canReview = Boolean(me?.full_name) && !isAuthor;
  const myReview = me ? reviews.find((r) => r.user_id === me.id) : undefined;
  const cover = coverUrl(book.cover_path);
  const sample = Boolean(book.sample_path);
  const label = (group: Record<string, { label: string }>, key: string) => group[key]?.label ?? key;

  const details = [
    { term: "Language", value: LANGUAGE_LABEL[book.language] },
    { term: "Author", value: book.author_name },
    { term: "Pages", value: book.page_count },
    { term: "Size", value: label(rates.trim_sizes, book.trim_size) },
    { term: "Binding", value: label(rates.binding, book.binding) },
    { term: "Interior", value: label(rates.interior, book.interior) },
    { term: "Genre", value: book.genre },
    { term: "Edition", value: book.edition_label },
    { term: "ISBN", value: book.isbn },
    {
      term: "Eliphas Edition ID",
      value: book.eeid ? (
        <Link href={`/e/${book.eeid}`} className="font-mono underline-offset-2 hover:underline" data-testid="book-eeid">
          {book.eeid}
        </Link>
      ) : null,
    },
  ].filter((d) => d.value);

  // Structured data so search engines understand this is a book for sale
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: { "@type": "Person", name: book.author_name },
    inLanguage: book.language,
    numberOfPages: book.page_count,
    isbn: book.isbn ?? undefined,
    image: cover ?? undefined,
    offers: { "@type": "Offer", price: Number(book.mrp), priceCurrency: "INR", availability: "https://schema.org/InStock" },
    // Only real reviews from verified buyers, and only when there are some
    ...(average !== null ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(average.toFixed(1)), reviewCount: reviews.length } } : {}),
  };

  const published = book.published_at ? new Date(book.published_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : null;
  const facts = [
    { term: "Pages", value: book.page_count ? String(book.page_count) : null },
    { term: "Size", value: label(rates.trim_sizes, book.trim_size).replace(/\s*\(.*\)$/, "") },
    { term: "Language", value: LANGUAGE_LABEL[book.language] },
    { term: "Published", value: published },
  ].filter((f) => f.value);

  const buyPanel = (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line" lang="en">
      <p className="mono text-[2rem] leading-none font-medium">{rupees(Number(book.mrp))}</p>
      <p className="mt-1.5 text-sm text-muted">Inclusive of all taxes</p>
      <p className="mt-1 text-sm text-muted">{label(rates.binding, book.binding)}</p>
      <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm">
        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <span>Delivery across India. Shipping for your PIN code is shown at checkout; usually arrives in 5–9 working days.</span>
      </p>
      <div className="mt-4 hidden gap-2.5 md:grid">
        <Link href={`/checkout/${book.slug}`} className="btn-accent min-h-12 text-base">
          Buy now
        </Link>
        <AddToCartButton bookId={book.id} className="min-h-12 text-base" />
      </div>
      <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-muted">
        <li className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-fg" aria-hidden /> Printed fresh for you
        </li>
        <li className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-fg" aria-hidden /> Tracked delivery
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-fg" aria-hidden /> Secure payment by Razorpay
        </li>
      </ul>
    </div>
  );

  return (
    <div className="container-x pt-4 pb-28 md:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="truncate text-sm text-muted">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <Link href="/books" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Bookstore
        </Link>
        {book.genre && (
          <>
            <span className="mx-2" aria-hidden>
              ›
            </span>
            <Link href={`/books?genre=${encodeURIComponent(book.genre)}`} className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
              {book.genre}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)_17.5rem]">
        {/* Cover, sample, edition record */}
        <div className="space-y-3 md:sticky md:top-24 md:self-start">
          <div className="rounded-[var(--radius-card)] bg-ivory px-[24%] py-[9%] ring-1 ring-line md:px-[14%] md:py-[12%]">
            <BookCover title={book.title} author={book.author_name} slug={book.slug} src={cover} size="lg" priority />
          </div>
          {sample ? (
            <Link href={`/books/${book.slug}/sample`} className="btn-tinted min-h-12 w-full gap-2 text-base" data-testid="read-sample">
              <BookOpen className="h-5 w-5" aria-hidden /> Read free sample
              <span className="text-sm font-normal text-muted">{book.sample_from && book.sample_to ? `· pages ${book.sample_from}–${book.sample_to}` : ""}</span>
            </Link>
          ) : (
            <p className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-line-strong text-sm text-muted" data-testid="sample-soon">
              <BookOpen className="h-4 w-4" aria-hidden /> Sample coming soon
            </p>
          )}
          {(book.isbn || book.eeid) && (
            <dl className="group-list text-sm">
              {book.isbn && (
                <div className="group-row justify-between">
                  <dt className="text-muted">ISBN</dt>
                  <dd className="mono">{book.isbn}</dd>
                </div>
              )}
              {book.eeid && (
                <div className="group-row justify-between">
                  <dt className="text-muted">Edition ID</dt>
                  <dd>
                    <Link href={`/e/${book.eeid}`} className="mono text-accent-fg underline-offset-2 hover:underline">
                      {book.eeid}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Title, author, facts, synopsis */}
        <div className="min-w-0 space-y-5" lang={book.language}>
          <div>
            <div className="flex flex-wrap gap-1.5 text-xs" lang="en">
              {[book.genre, LANGUAGE_LABEL[book.language], book.edition_label].filter(Boolean).map((t) => (
                <span key={t} className="badge bg-surface-2 font-medium text-muted ring-1 ring-line ring-inset">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="display mt-3 text-[1.875rem] leading-tight md:text-[2.375rem]">{book.title}</h1>
            {book.subtitle && <p className="mt-1.5 font-serif text-lg text-muted italic md:text-xl">{book.subtitle}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" lang="en">
              <AuthorAvatar name={book.author_name} path={author?.avatar_path ?? null} size="sm" />
              <p className="flex items-center gap-1.5 text-sm">
                {handle ? (
                  <Link href={`/authors/${handle}`} className="font-medium text-accent-fg hover:underline hover:underline-offset-2">
                    {book.author_name}
                  </Link>
                ) : (
                  <span className="font-medium">{book.author_name}</span>
                )}
                {author?.verified_author && <VerifiedBadge compact />}
              </p>
              {average !== null && (
                <a href="#reviews" className="text-sm text-muted hover:text-fg">
                  <span className="mono text-fg">{average.toFixed(1)}</span> ★ · {reviews.length === 1 ? "1 review" : `${reviews.length} reviews`}
                </a>
              )}
              {handle && me?.id !== book.author_id && (
                <div className="ml-auto">
                  <FollowButton authorId={book.author_id} authorName={book.author_name} following={following} />
                </div>
              )}
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] bg-line ring-1 ring-line sm:grid-cols-4" lang="en">
              {facts.map((f) => (
                <div key={f.term} className="bg-surface px-3.5 py-3">
                  <dt className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase">{f.term}</dt>
                  <dd className="mt-1 text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="lg:hidden">{buyPanel}</div>

          {book.description && (
            <section>
              <h2 className="text-xs font-semibold tracking-[0.06em] text-muted uppercase" lang="en">
                About this book
              </h2>
              <p className="mt-2.5 font-serif text-[1.0625rem] leading-relaxed whitespace-pre-line text-fg/90">{book.description}</p>
            </section>
          )}
        </div>

        <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">{buyPanel}</div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" lang="en">
        {author && (author.bio || handle) && (
          <section className="card">
            <h2 className="text-lg">About {book.author_name}</h2>
            <div className="mt-4 flex gap-4">
              <AuthorAvatar name={book.author_name} path={author.avatar_path} size="lg" />
              <div className="min-w-0">
                {author.bio ? <p className="line-clamp-6 text-sm leading-relaxed text-fg/85">{author.bio}</p> : <p className="text-sm text-muted">This author hasn&apos;t added a bio yet.</p>}
                {handle && (
                  <Link href={`/authors/${handle}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent-fg hover:underline md:min-h-0">
                    View profile and books
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}
        <section className="card">
          <h2 className="text-lg">Product details</h2>
          <dl className="mt-3 divide-y divide-line">
            {details.map((d) => (
              <div key={d.term} className="grid grid-cols-[9rem_1fr] gap-4 py-2.5 text-sm">
                <dt className="text-muted">{d.term}</dt>
                <dd className="font-medium">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div id="reviews" className="scroll-mt-24 lg:col-span-2">
          <BookReviews bookId={book.id} slug={book.slug} reviews={reviews} average={average} counts={counts} me={me?.id ?? null} isAuthor={isAuthor} canReview={canReview} mine={myReview ? { rating: myReview.rating, body: myReview.body ?? "" } : null} />
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg sm:text-xl">More by {book.author_name}</h2>
          <BookShelf books={more} />
        </section>
      )}

      {/* Phone buy bar */}
      <div className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line px-4 py-3 md:hidden" lang="en">
        <div className="flex items-center gap-3">
          <p className="mono shrink-0 text-lg leading-tight font-medium">{rupees(Number(book.mrp))}</p>
          <div className="ml-auto flex flex-1 flex-wrap justify-end gap-2">
            <AddToCartButton bookId={book.id} className="min-h-12 flex-1 px-3 text-sm" />
            <Link href={`/checkout/${book.slug}`} className="btn-accent min-h-12 flex-1 px-3 text-base">
              Buy now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
