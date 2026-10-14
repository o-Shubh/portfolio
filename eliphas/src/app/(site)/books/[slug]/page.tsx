import { Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookGrid } from "@/components/BookCard";
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/books" className="hover:text-fg hover:underline">
          Bookstore
        </Link>{" "}
        / <span lang={book.language}>{book.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,320px)_1fr] md:gap-12">
        <div className="mx-auto w-2/3 max-w-xs md:w-full">
          <BookCover title={book.title} author={book.author_name} slug={book.slug} src={cover} size="lg" priority />
        </div>

        <div lang={book.language}>
          <h1 className="text-3xl font-semibold md:text-4xl">{book.title}</h1>
          {book.subtitle && <p className="mt-1 text-lg text-muted">{book.subtitle}</p>}
          <p className="mt-3 font-medium">
            <span lang="en">by</span> {book.author_name}
          </p>

          <div className="card mt-6" lang="en">
            <p className="font-heading text-3xl font-semibold">{rupees(Number(book.mrp))}</p>
            <p className="text-sm text-muted">MRP, inclusive of taxes</p>
            <Link href={`/checkout/${book.slug}`} className="btn-accent mt-4 w-full sm:w-auto">
              Buy now
            </Link>
            <p className="mt-4 flex items-start gap-2 text-sm">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>
                Printed when you order and shipped across India. Shipping {rupees(shipping.flat)}, free on orders of{" "}
                {rupees(shipping.free_above)} or more.
              </span>
            </p>
          </div>

          {book.description && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold" lang="en">
                About this book
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{book.description}</p>
            </section>
          )}

          <section className="mt-8" lang="en">
            <h2 className="text-xl font-semibold">Details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {details.map((d) => (
                <div key={d.term}>
                  <dt className="text-sm text-muted">{d.term}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-semibold">More by {book.author_name}</h2>
          <div className="mt-5">
            <BookGrid books={more} />
          </div>
        </section>
      )}
    </div>
  );
}
