import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { estimateCopy } from "@/lib/commission";
import { authorRule } from "@/lib/plans";
import { StatusBadge } from "@/components/StatusBadge";
import { printFileLinks, timeAgo } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { formatPhone } from "@/lib/phone";
import { gatewayPercent, printCost } from "@/lib/pricing";
import { coverSizeMatches, fullCoverSize, pageSizeMatches, submitChecklist } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EditionIdentity } from "@/components/editions/EditionIdentity";
import { EditionActions } from "./EditionActions";
import { ReviewActions } from "./ReviewActions";
import { ContentCheckReport } from "@/components/ContentCheckReport";
import { RunContentCheck } from "@/components/RunContentCheck";
import { checkResults, latestCheck } from "@/lib/manuscript-check";

export const metadata: Metadata = { title: "Review book" };

export default async function AdminBookPage({ params }: PageProps<"/admin/books/[id]">) {
  await requireRole(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: book } = await createAdminClient().from("books").select("*").eq("id", id).maybeSingle();
  if (!book) notFound();
  const [{ data: author }, settings, links, check] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, city, state").eq("id", book.author_id).single(),
    getPricingSettings(),
    printFileLinks(book),
    latestCheck(book),
  ]);
  const results = checkResults(check);
  const { rates, fees } = settings;
  const label = (g: Record<string, { label: string }>, k: string) => g[k]?.label ?? `${k} (missing)`;

  const cost = book.page_count
    ? printCost(
        {
          page_count: book.page_count,
          trim_size: book.trim_size,
          binding: book.binding,
          interior: book.interior,
          paper: book.paper,
          cover_finish: book.cover_finish,
        },
        rates,
      )
    : null;
  const { rule, version } = await authorRule(book.author_id);
  const e = cost !== null && book.mrp !== null ? estimateCopy(Number(book.mrp) * 100, cost * 100, rule, gatewayPercent(fees)) : null;

  // Automatic checks to help the reviewer
  const trim = rates.trim_sizes[book.trim_size];
  const expectedCover = fullCoverSize(book, rates);
  const warnings: string[] = [];
  if (book.manuscript_width_in && trim && !pageSizeMatches(Number(book.manuscript_width_in), Number(book.manuscript_height_in), trim))
    warnings.push(`Manuscript pages are ${book.manuscript_width_in} × ${book.manuscript_height_in} in, but the book size is ${trim.label}.`);
  if (expectedCover && book.print_cover_width_in && !coverSizeMatches(Number(book.print_cover_width_in), Number(book.print_cover_height_in), expectedCover))
    warnings.push(`Print cover is ${book.print_cover_width_in} × ${book.print_cover_height_in} in; expected ${expectedCover.widthIn} × ${expectedCover.heightIn} in.`);
  if (book.binding === "hardcover") warnings.push("Hardcover: confirm the cover wrap size with the printer.");
  if (e && e.authorEarningPaise < 100) warnings.push("At today's rates the author would earn nothing at this MRP.");
  const checklist = submitChecklist(book, settings, rule);

  const details = [
    ["Language", LANGUAGE_LABEL[book.language]],
    ["Genre", book.genre ?? "—"],
    ["Pages", book.page_count ?? "—"],
    ["Size", label(rates.trim_sizes, book.trim_size)],
    ["Inside", label(rates.interior, book.interior)],
    ["Paper", label(rates.paper, book.paper)],
    ["Binding", label(rates.binding, book.binding)],
    ["Finish", label(rates.cover_finish, book.cover_finish)],
    ["ISBN", book.isbn ?? "—"],
  ];

  return (
    <>
      <Link href="/admin/review" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Review queue
      </Link>

      <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-24 shrink-0 sm:w-32">
              <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" />
            </div>
            <div className="min-w-0">
              <h1 className="display text-2xl md:text-3xl" lang={book.language}>
                {book.title}
              </h1>
              {book.subtitle && <p className="text-muted">{book.subtitle}</p>}
              <p className="mt-1">by {book.author_name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={book.status} />
                {book.submitted_at && <span className="text-sm text-muted">submitted {timeAgo(book.submitted_at)}</span>}
              </div>
              {author && (
                <p className="mt-2 text-sm text-muted">
                  Account: {author.full_name} · {formatPhone(author.phone)} · {author.city}, {author.state}
                </p>
              )}
            </div>
          </div>

          <section className="card">
            <h2 className="text-lg">Files</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <FileButton href={links.manuscript} label="Manuscript PDF" />
              <FileButton href={links.printCover} label="Print cover PDF" />
              <FileButton href={book.cover_path ? coverUrl(book.cover_path) : null} label="Front cover image" />
            </div>
            <p className="mt-3 text-sm text-muted">
              Detected: {book.manuscript_width_in ? `pages ${book.manuscript_width_in} × ${book.manuscript_height_in} in` : "page size unknown"}
              {book.print_cover_width_in && ` · cover ${book.print_cover_width_in} × ${book.print_cover_height_in} in`}
              {expectedCover && ` · expected cover ${expectedCover.widthIn} × ${expectedCover.heightIn} in (spine ${expectedCover.spineMm} mm)`}
            </p>
          </section>

          {warnings.length > 0 && (
            <section role="note" className="rounded-[var(--radius-card)] bg-accent/10 ring-1 ring-accent/30 p-5">
              <h2 className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5" aria-hidden /> Check these
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2 className="text-lg">Description</h2>
            <p className="mt-2 whitespace-pre-line" lang={book.language}>
              {book.description ?? "—"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card space-y-3" aria-labelledby="admin-content-h" data-testid="admin-content-check">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="admin-content-h" className="text-lg">
                Content check
              </h2>
            </div>
            {results ? (
              <>
                <p className={`text-sm font-medium ${check!.overall === "pass" ? "text-success" : check!.overall === "blocked" ? "text-danger" : ""}`}>
                  {check!.overall === "pass" ? "Nothing found." : check!.overall === "blocked" ? "Needed action from the author (see below)." : "Things to look at."}
                </p>
                <ContentCheckReport results={results} />
              </>
            ) : (
              <p className="text-sm text-muted">{book.manuscript_path ? "This manuscript hasn't been checked yet." : "No manuscript yet."}</p>
            )}
            {book.content_note && (
              <div className="rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm">
                <p className="font-semibold">Author&apos;s note</p>
                <p className="whitespace-pre-line">{book.content_note}</p>
              </div>
            )}
            {book.manuscript_path && <RunContentCheck bookId={book.id} auto={false} label={results ? "Check again" : "Run the check"} />}
          </section>
          <section className="card">
            <ReviewActions bookId={book.id} status={book.status} slug={book.slug} lastNote={book.review_note} />
          </section>
          <section className="card">
            <EditionActions
              bookId={book.id}
              status={book.status}
              hasEeid={Boolean(book.eeid)}
              revisedWaiting={Boolean(book.print_review_requested_at)}
              removed={Boolean(book.removed_at)}
              revisedLink={book.print_review_requested_at ? links.printCover : null}
            />
          </section>
          <EditionIdentity book={book} viewer="admin" />
          {e && (
            <section className="card">
              <h2 className="mb-3 text-lg">Per copy at today&apos;s rates</h2>
              <p className="-mt-1 mb-3 text-xs text-muted">Author&apos;s plan: {version.plan === "legacy" ? "original terms" : version.plan}</p>
              <EarningsBreakdown e={e} />
            </section>
          )}
          <section className="card">
            <h2 className="text-lg">Author&apos;s checklist</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.ok ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Done" /> : <Circle className="h-4 w-4 text-muted" aria-label="Missing" />}
                  {c.label}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function FileButton({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="btn-ghost pointer-events-none opacity-50">{label}: missing</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="btn-ghost">
      <Download className="h-4 w-4" aria-hidden /> {label}
    </a>
  );
}
