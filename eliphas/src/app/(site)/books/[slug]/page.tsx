import { BookOpen, PackageCheck, Printer, ShieldCheck, Truck } from "lucide-react";
import { sampleUrl } from "@/lib/book-sample";
import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
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

  const [more, { rates }, handle] = await Promise.all([moreByAuthor(book), getPricingSettings(), authorHandle(book.author_id)]);
  const cover = coverUrl(book.cover_path);
  const sample = sampleUrl(book.sample_path);
  const label = (group: Record<string, { label: string }>, key: string) => group[key]?.label ?? key;

  const details = [
    { term: "Language", value: LANGUAGE_LABEL[book.language] },
    { term: "Author", value: book.author_name },
    { term: "Pages", value: book.page_count },
    { term: "Size", value: label(rates.trim_sizes, book.trim_size) },
    { term: "Binding", value: label(rates.binding, book.binding) },
    { term: "Interior", value: label(rates.interior, book.interior) },
    { term: "Genre", value: book.genre },
    { term: "ISBN", value: book.isbn },
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
  };

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

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
        <div className="md:sticky md:top-32 md:self-start">
          <div className="rounded-xl bg-surface px-[24%] py-[9%] shadow-soft ring-1 ring-line md:px-[16%] md:py-[11%]">
            <BookCover title={book.title} author={book.author_name} slug={book.slug} src={cover} size="lg" priority />
          </div>
        </div>

        <div className="space-y-4" lang={book.language}>
          <div className="card">
            <h1 className="text-2xl md:text-3xl">{book.title}</h1>
            {book.subtitle && <p className="mt-1 text-muted md:text-lg">{book.subtitle}</p>}
            <p className="mt-2 text-sm">
              <span lang="en" className="text-muted">
                by
              </span>{" "}
              {handle ? (
                <Link href={`/authors/${handle}`} className="font-medium text-accent-fg hover:underline hover:underline-offset-2">
                  {book.author_name}
                </Link>
              ) : (
                <span className="font-medium text-accent-fg">{book.author_name}</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs" lang="en">
              {[LANGUAGE_LABEL[book.language], book.genre, label(rates.binding, book.binding)].filter(Boolean).map((t) => (
                <span key={t} className="rounded-md bg-surface-2 px-2 py-1 text-muted">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-5 border-t border-line pt-5" lang="en">
              <p className="text-3xl font-semibold tabular-nums">{rupees(Number(book.mrp))}</p>
              <p className="mt-0.5 text-sm text-muted">Inclusive of all taxes</p>
              <p className="mt-3 flex items-start gap-2 text-sm">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>Delivery across India · shipping for your PIN code is shown at checkout · usually arrives in 5–9 working days</span>
              </p>
              {sample && (
                <a href={sample} target="_blank" rel="noopener" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-2" data-testid="read-sample">
                  <BookOpen className="h-4 w-4" aria-hidden /> Read a free sample (pages {book.sample_from}–{book.sample_to}, PDF)
                </a>
              )}
              <div className="mt-5 hidden gap-3 md:grid md:grid-cols-2">
                <AddToCartButton bookId={book.id} className="min-h-12 text-base" />
                <Link href={`/checkout/${book.slug}`} className="btn-accent min-h-12 text-base">
                  Buy now
                </Link>
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center text-xs text-muted" lang="en">
              <li className="flex flex-col items-center gap-1.5">
                <Printer className="h-5 w-5 text-fg" aria-hidden /> Printed fresh for you
              </li>
              <li className="flex flex-col items-center gap-1.5">
                <PackageCheck className="h-5 w-5 text-fg" aria-hidden /> Tracked delivery
              </li>
              <li className="flex flex-col items-center gap-1.5">
                <ShieldCheck className="h-5 w-5 text-fg" aria-hidden /> Secure payment
              </li>
            </ul>
          </div>

          {book.description && (
            <section className="card">
              <h2 className="text-lg" lang="en">
                About this book
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-fg/90">{book.description}</p>
            </section>
          )}

          <section className="card" lang="en">
            <h2 className="text-lg">Product details</h2>
            <dl className="mt-3 divide-y divide-line">
              {details.map((d) => (
                <div key={d.term} className="grid grid-cols-[8rem_1fr] gap-4 py-2.5 text-sm">
                  <dt className="text-muted">{d.term}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg sm:text-xl">More by {book.author_name}</h2>
          <BookShelf books={more} />
        </section>
      )}

      {/* Phone buy bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 md:hidden" lang="en">
        <div className="flex items-center gap-3">
          <p className="shrink-0 text-lg leading-tight font-semibold tabular-nums">{rupees(Number(book.mrp))}</p>
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
