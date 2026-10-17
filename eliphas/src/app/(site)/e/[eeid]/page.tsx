import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BookCover } from "@/components/BookCover";
import { authorHandle, coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { isEeid } from "@/lib/eeid-format";
import { rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, permanent page for an Eliphas Edition ID. Reads only public fields; never files, contacts or admin data.
const PUBLIC = "id, slug, title, subtitle, author_name, author_id, language, binding, edition_label, isbn, mrp, cover_path, sample_path, status, published_at, removed_at, eeid" as const;

const lookup = cache(async (eeid: string) => {
  if (!isEeid(eeid)) return null;
  const admin = createAdminClient();
  const { data: reg } = await admin.from("edition_ids").select("eeid, book_id").eq("eeid", eeid).maybeSingle();
  if (!reg) return null;
  if (!reg.book_id) return { reg, book: null };
  const { data: book } = await admin.from("books").select(PUBLIC).eq("id", reg.book_id).maybeSingle();
  return { reg, book };
});

type Book = NonNullable<NonNullable<Awaited<ReturnType<typeof lookup>>>["book"]>;
const stateOf = (b: Book | null) =>
  !b || b.removed_at ? "removed" : b.status === "published" ? "live" : b.published_at ? "unavailable" : "pending";

export async function generateMetadata({ params }: PageProps<"/e/[eeid]">): Promise<Metadata> {
  const { eeid } = await params;
  const found = await lookup(eeid);
  if (!found) return { title: "Edition not found", robots: { index: false } };
  const b = found.book;
  if (stateOf(b) !== "live" || !b) return { title: eeid, robots: { index: false } };
  return { title: `${b.title} (${eeid})`, description: `${b.title} by ${b.author_name}. Eliphas Edition ID ${eeid}.`, alternates: { canonical: `/books/${b.slug}` } };
}

export default async function EditionPage({ params }: PageProps<"/e/[eeid]">) {
  const { eeid } = await params;
  const found = await lookup(eeid);
  if (!found) notFound();
  const b = found.book;
  const state = stateOf(b);

  const shell = (children: React.ReactNode) => (
    <div className="container-x py-8 md:py-12" data-testid="edition-page" data-state={state}>
      {children}
    </div>
  );
  const idLine = (
    <p className="text-sm text-muted">
      Eliphas Edition ID <span className="font-mono font-semibold text-fg" data-testid="edition-eeid">{eeid}</span>
    </p>
  );

  if (state === "removed" || !b) {
    return shell(
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl">This edition is not available</h1>
        <div className="mt-3">{idLine}</div>
        <Link href="/books" className="btn-ghost mt-6 inline-flex">
          Browse the bookstore
        </Link>
      </div>,
    );
  }
  if (state === "pending") {
    return shell(
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl">Not yet available</h1>
        <p className="mt-2 text-muted">This edition has been approved and will appear here when it&apos;s published.</p>
        <div className="mt-3">{idLine}</div>
        <Link href="/books" className="btn-ghost mt-6 inline-flex">
          Browse the bookstore
        </Link>
      </div>,
    );
  }

  const [{ rates }, handle] = await Promise.all([getPricingSettings(), authorHandle(b.author_id)]);
  const live = state === "live";
  const facts = [
    { term: "Eliphas Edition ID", value: <span className="font-mono" data-testid="edition-eeid">{eeid}</span> },
    { term: "Edition", value: b.edition_label || null },
    { term: "Format", value: rates.binding[b.binding]?.label ?? b.binding },
    { term: "Language", value: LANGUAGE_LABEL[b.language] ?? b.language },
    { term: "ISBN", value: b.isbn || null },
    { term: "Published", value: live && b.published_at ? new Date(b.published_at).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }) : null },
  ].filter((f) => f.value);

  return shell(
    <div className="grid gap-8 md:grid-cols-[minmax(0,240px)_1fr]" lang="en">
      <div className="mx-auto w-48 md:w-full">
        <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} />
      </div>
      <div className="min-w-0">
        <p className="eyebrow">Edition</p>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl">{b.title}</h1>
        {b.subtitle && <p className="mt-1 text-lg text-muted">{b.subtitle}</p>}
        <p className="mt-2">
          by{" "}
          {handle ? (
            <Link href={`/authors/${handle}`} className="font-semibold text-accent-fg hover:underline">
              {b.author_name}
            </Link>
          ) : (
            <span className="font-semibold">{b.author_name}</span>
          )}
        </p>
        {!live && (
          <p role="status" className="mt-4 rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm" data-testid="edition-unavailable">
            This edition isn&apos;t on sale right now.
          </p>
        )}
        <dl className="mt-5 divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
          {facts.map((f) => (
            <div key={f.term} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5 text-sm">
              <dt className="text-muted">{f.term}</dt>
              <dd className="font-medium break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
        {live && (
          <div className="mt-5 space-y-3">
            {b.sample_path && (
              <Link href={`/books/${b.slug}/sample`} className="btn-ghost w-full gap-2 sm:w-auto" data-testid="edition-sample">
                <BookOpen className="h-5 w-5" aria-hidden /> Read sample
              </Link>
            )}
            {b.mrp !== null && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-2xl font-semibold tabular-nums">{rupees(Number(b.mrp))}</p>
                <AddToCartButton bookId={b.id} className="min-h-12" />
                <Link href={`/checkout/${b.slug}`} className="btn-accent min-h-12" data-testid="edition-buy">
                  Buy now
                </Link>
              </div>
            )}
            <Link href={`/books/${b.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-fg hover:underline">
              Full book page, reviews and details
            </Link>
          </div>
        )}
        <p className="mt-6 text-xs text-muted">
          The Eliphas Edition ID is our own identifier for this edition and format. It isn&apos;t an ISBN, and scanning a book&apos;s QR code
          doesn&apos;t confirm that a particular printed copy is genuine.
        </p>
      </div>
    </div>,
  );
}
