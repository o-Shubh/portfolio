import { BookOpen, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BookCover } from "@/components/BookCover";
import { CopyButton } from "@/components/editions/CopyButton";
import { qrOrigin, qrSvg } from "@/lib/edition-qr";
import { authorHandle, coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { editionUrl, isEeid } from "@/lib/eeid-format";
import { rupees } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, permanent page for an Eliphas Edition ID. Reads only public fields; never files, contacts or admin data.
const PUBLIC = "id, slug, title, subtitle, author_name, author_id, language, binding, trim_size, interior, paper, page_count, edition_label, isbn, mrp, cover_path, sample_path, status, published_at, removed_at, eeid" as const;

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
      Eliphas Edition ID <span className="id-mono font-semibold text-fg" data-testid="edition-eeid">{eeid}</span>
    </p>
  );

  if (state === "removed" || !b) {
    return shell(
      <div className="mx-auto max-w-md text-center">
        <h1 className="display text-2xl">This edition is not available</h1>
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
        <h1 className="display text-2xl">Not yet available</h1>
        <p className="mt-2 text-muted">This edition has been approved and will appear here when it&apos;s published.</p>
        <div className="mt-3">{idLine}</div>
        <Link href="/books" className="btn-ghost mt-6 inline-flex">
          Browse the bookstore
        </Link>
      </div>,
    );
  }

  const [{ rates }, handle, qr] = await Promise.all([getPricingSettings(), authorHandle(b.author_id), qrSvg(editionUrl(qrOrigin().origin, eeid))]);
  const live = state === "live";
  const label = (group: Record<string, { label: string }>, key: string) => group[key]?.label ?? key;
  const specs = [
    { term: "Format", value: label(rates.binding, b.binding) },
    { term: "Size", value: label(rates.trim_sizes, b.trim_size) },
    { term: "Interior", value: label(rates.interior, b.interior) },
    { term: "Paper", value: label(rates.paper, b.paper) },
    { term: "Pages", value: b.page_count ? String(b.page_count) : null },
    { term: "Language", value: LANGUAGE_LABEL[b.language] ?? b.language },
  ].filter((f) => f.value);
  const record = [
    { term: "Edition ID", value: <span className="id-mono" data-testid="edition-eeid">{eeid}</span> },
    { term: "Edition", value: b.edition_label || null },
    { term: "ISBN", value: b.isbn ? <span className="id-mono">{b.isbn}</span> : null },
    { term: "Published", value: live && b.published_at ? new Date(b.published_at).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }) : null },
  ].filter((f) => f.value);

  return shell(
    <div lang="en">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Edition record</p>
          <h1 className="display book-title mt-1.5 text-[1.875rem] leading-tight md:text-[2.5rem]" lang={b.language}>
            {b.title}
          </h1>
          {b.subtitle && <p className="mt-1 font-serif text-lg text-muted italic" lang={b.language}>{b.subtitle}</p>}
          <p className="mt-2 text-sm">
            by{" "}
            {handle ? (
              <Link href={`/authors/${handle}`} className="font-semibold text-accent-fg hover:underline">
                {b.author_name}
              </Link>
            ) : (
              <span className="font-semibold">{b.author_name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start rounded-[var(--radius-card)] bg-surface px-4 py-2.5 ring-1 ring-line md:self-auto">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase">Eliphas Edition ID</p>
            <p className="id-mono font-medium">{eeid}</p>
          </div>
          <CopyButton text={eeid} label="Copy" />
        </div>
      </div>

      {!live && (
        <p role="status" className="notice-warn mt-5" data-testid="edition-unavailable">
          This edition isn&apos;t on sale right now.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5">
          <div className="flex gap-4 rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
            <div className="w-24 shrink-0 sm:w-28">
              <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size="sm" />
            </div>
            <dl className="min-w-0 flex-1 divide-y divide-line text-sm">
              {record.map((f) => (
                <div key={f.term} className="flex justify-between gap-3 py-2 first:pt-0">
                  <dt className="text-muted">{f.term}</dt>
                  <dd className="text-right font-medium break-words">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="rounded-[var(--radius-card)] bg-surface p-5 text-center ring-1 ring-line">
            <div className="mx-auto w-44 rounded-lg bg-white p-3 ring-1 ring-line [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label={`QR code for edition ${eeid}`} dangerouslySetInnerHTML={{ __html: qr }} />
            <figcaption className="mt-3 text-xs text-muted">This QR code opens this page. It appears on the edition&apos;s label.</figcaption>
          </figure>
        </div>

        <div className="space-y-5">
          <section className="rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line">
            <h2 className="text-lg">Edition specifications</h2>
            <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {specs.map((f) => (
                <div key={f.term} className="rounded-[var(--radius-control)] bg-surface-2 px-3.5 py-3">
                  <dt className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase">{f.term}</dt>
                  <dd className="mt-0.5 font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {live && (
            <section className="flex flex-col gap-4 rounded-[18px] bg-primary p-5 text-on-primary sm:p-6">
              <div className="flex flex-wrap items-baseline gap-x-3">
                {b.mrp !== null && <p className="mono text-2xl font-medium">{rupees(Number(b.mrp))}</p>}
                <p className="text-sm text-on-primary/75">Inclusive of all taxes · printed fresh when you order</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {b.mrp !== null && (
                  <Link href={`/checkout/${b.slug}`} className="btn-accent min-h-12" data-testid="edition-buy">
                    Buy now
                  </Link>
                )}
                {b.mrp !== null && <AddToCartButton bookId={b.id} className="min-h-12 bg-white/10 text-on-primary ring-0 hover:bg-white/15" />}
                {b.sample_path && (
                  <Link href={`/books/${b.slug}/sample`} className="btn min-h-12 gap-2 bg-white/10 text-on-primary hover:bg-white/15" data-testid="edition-sample">
                    <BookOpen className="h-5 w-5" aria-hidden /> Read sample
                  </Link>
                )}
              </div>
              <Link href={`/books/${b.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-on-primary underline-offset-2 hover:underline md:min-h-0">
                Full book page, reviews and details →
              </Link>
            </section>
          )}
        </div>
      </div>

      <p className="notice-info mt-6 text-xs">
        <Info className="h-4 w-4 shrink-0 text-accent-fg" aria-hidden />
        <span>
          The Eliphas Edition ID is our own identifier for this edition and format. It isn&apos;t an ISBN, and scanning a book&apos;s QR code
          doesn&apos;t confirm that a particular printed copy is genuine.
        </span>
      </p>
    </div>,
  );
}
