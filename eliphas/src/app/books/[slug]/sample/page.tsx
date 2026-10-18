import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleReader } from "@/components/SampleReader";
import { sampleUrl } from "@/lib/book-sample";
import { getPublishedBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";

export async function generateMetadata({ params }: PageProps<"/books/[slug]/sample">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getPublishedBook(slug);
  return { title: book ? `Free sample: ${book.title}` : "Sample not found", robots: { index: false } };
}

/** Full-screen sample reader. No login needed; only the separate public sample file is loaded. */
export default async function SamplePage({ params }: PageProps<"/books/[slug]/sample">) {
  const { slug } = await params;
  const book = await getPublishedBook(slug);
  if (!book) notFound();
  const url = sampleUrl(book.sample_path);

  if (!url) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="display text-2xl">Sample coming soon</h1>
        <p className="text-muted">The author is preparing a free sample of {book.title}. You can still read the description and reviews on the book page.</p>
        <Link href={`/books/${book.slug}`} className="btn-primary mt-2">
          Back to the book
        </Link>
      </main>
    );
  }

  const note =
    book.sample_from && book.sample_to
      ? `Pages ${book.sample_from}–${book.sample_to}${book.page_count ? ` of ${book.page_count}` : ""}`
      : "An excerpt chosen by the author";
  return (
    <main id="main">
      <h1 className="sr-only">Free sample of {book.title}</h1>
      <SampleReader
        url={url}
        title={book.title}
        backHref={`/books/${book.slug}`}
        buyHref={`/checkout/${book.slug}`}
        price={book.mrp !== null ? rupees(Number(book.mrp)) : undefined}
        note={note}
      />
    </main>
  );
}
