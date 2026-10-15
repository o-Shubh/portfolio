import { PackageCheck, Printer, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookShelf } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { coverUrl, getPublishedBook, LANGUAGE_LABEL, moreByAuthor } from "@/lib/books";
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

  const [more, { rates, shipping }] = await Promise.all([moreByAuthor(book), getPricingSettings()]);
  const cover = coverUrl(book.cover_path);
  const label = (group: Record<string, { label: string }>, key: string) => group[key]?.label ?? key;

  const details = [
    { term: "Language", value: LANGUAGE_LABEL[book.language] },
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
    <div className="container-x py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/books" className="hover:text-fg">
          Bookstore
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span lang={book.language} className="text-fg">
          {book.title}
        </span>
      </nav>

      <div className="mt-6 grid gap-10 md:mt-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl bg-surface-2 px-[26%] py-[10%] md:px-[18%] md:py-[12%]">
            <BookCover title={book.title} author={book.author_name} slug={book.slug} src={cover} size="lg" priority />
          </div>
        </div>

        <div lang={book.language}>
          {book.genre && (
            <p className="eyebrow" lang="en">
              {book.genre}
            </p>
          )}
          <h1 className="mt-3 text-4xl md:text-6xl">{book.title}</h1>
          {book.subtitle && <p className="mt-3 font-heading text-xl text-muted italic md:text-2xl">{book.subtitle}</p>}
          <p className="mt-4 text-lg">
            <span lang="en" className="text-muted">
              by
            </span>{" "}
            {book.author_name}
          </p>

          <div className="mt-8 rounded-xl border border-line p-5 md:p-6" lang="en">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-heading text-4xl tracking-tight">{rupees(Number(book.mrp))}</p>
                <p className="mt-1 text-sm text-muted">{label(rates.binding, book.binding)} · inclusive of taxes</p>
              </div>
              <Link href={`/checkout/${book.slug}`} className="btn-primary min-h-12 w-full px-8 sm:w-auto">
                Buy now
              </Link>
            </div>
            <ul className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm">
              <li className="flex items-start gap-2.5">
                <Printer className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                Printed fresh for you when you order
              </li>
              <li className="flex items-start gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <span>
                  Shipping {rupees(shipping.flat)} · free on orders of {rupees(shipping.free_above)} or more
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                Track your order from print to delivery
              </li>
            </ul>
          </div>

          {book.description && (
            <section className="mt-12">
              <h2 className="font-sans text-sm font-medium tracking-[0.12em] text-muted uppercase" lang="en">
                About this book
              </h2>
              <p className="mt-4 text-lg leading-relaxed whitespace-pre-line">{book.description}</p>
            </section>
          )}

          <section className="mt-12" lang="en">
            <h2 className="font-sans text-sm font-medium tracking-[0.12em] text-muted uppercase">Details</h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {details.map((d) => (
                <div key={d.term} className="flex justify-between gap-6 py-3">
                  <dt className="text-muted">{d.term}</dt>
                  <dd className="text-right font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-24">
          <h2 className="text-3xl md:text-4xl">More by {book.author_name}</h2>
          <div className="mt-8">
            <BookShelf books={more} />
          </div>
        </section>
      )}
    </div>
  );
}
