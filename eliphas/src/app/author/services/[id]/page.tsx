import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleGallery } from "@/components/SampleGallery";
import { ServiceStatusBadge } from "@/components/ServiceStatusBadge";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { SAMPLE_LABEL, SERVICE_PORTFOLIO } from "@/lib/service-portfolio";
import { BUNDLE_PARTS, REQUIREMENT_FIELDS, SERVICE_STATUS, type QuoteLine } from "@/lib/services";
import { openUpgradeFor, upgradePriors } from "@/lib/services-server";
import { serviceFilesWithLinks } from "@/lib/service-files";
import { createAdminClient } from "@/lib/supabase/admin";
import { CancelService, QuoteActions, RequirementsForm, RequirementUploads, ReviewActions, UpgradeToBundle } from "./AuthorServiceForms";

export const metadata: Metadata = { title: "Service request" };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function AuthorServiceOrder({ params }: PageProps<"/author/services/[id]">) {
  const profile = await requireRole(["author", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: order } = await admin.from("service_orders").select("*, service_catalog(*), books(id, title)").eq("id", id).maybeSingle();
  if (!order || order.author_id !== profile.id) notFound(); // only the author's own orders

  const [files, { data: quotes }, { data: events }, priors, replacedBy] = await Promise.all([
    serviceFilesWithLinks(order.id),
    admin.from("service_quotes").select("*").eq("service_order_id", order.id).order("issued_at", { ascending: false }),
    admin.from("service_events").select("*").eq("service_order_id", order.id).order("created_at", { ascending: false }),
    upgradePriors(order),
    openUpgradeFor(order.id),
  ]);
  const portfolio = order.service_catalog ? SERVICE_PORTFOLIO[order.service_catalog.code] : undefined;
  const canUpgrade = Boolean(order.service_catalog && BUNDLE_PARTS.includes(order.service_catalog.code)) && !replacedBy && !["cancelled", "refunded"].includes(order.status);
  const cat = order.service_catalog;
  const reqs = order.requirements as Record<string, string>;
  const openQuote = (quotes ?? []).find((q) => q.status === "issued" || q.status === "accepted");
  const paid = (quotes ?? []).some((q) => q.status === "paid");
  const delivered = files.filter((f) => f.kind === "draft" || f.kind === "final");
  const uploaded = files.filter((f) => f.kind === "requirement" || f.kind === "reference");
  const name = order.kind === "pro_creative" ? "Pro promotional creative" : (cat?.name ?? "Service");
  const canCancel = ["requirements_pending", "scope_review", "quote_awaiting_acceptance", "payment_pending", "queued"].includes(order.status);

  return (
    <>
      <Link href="/author/services" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Services
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl md:text-3xl">{name}</h1>
        <ServiceStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-muted">
        {order.order_number} · {SERVICE_STATUS[order.status].author}
      </p>
      {order.books && (
        <p className="mt-1 text-sm">
          For your book{" "}
          <Link href={`/author/books/${order.books.id}/files`} className="font-semibold underline">
            {order.books.title}
          </Link>
          {cat && ["formatting", "bundle"].includes(cat.code) && ". We use the manuscript you uploaded for it."}
        </p>
      )}
      {replacedBy && (
        <p className="mt-3 rounded-lg bg-accent/15 px-3 py-2 text-sm">
          This request is part of your bundle upgrade{" "}
          <Link href={`/author/services/${replacedBy.id}`} className="font-semibold underline">
            {replacedBy.order_number}
          </Link>
          . It won&apos;t be charged separately; if it was never paid, it closes when you pay the bundle.
        </p>
      )}
      {priors.length > 0 && (
        <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <p className="font-semibold">Bundle upgrade. Replaces:</p>
          <ul className="mt-1 space-y-0.5">
            {priors.map((p) => (
              <li key={p.id}>
                <Link href={`/author/services/${p.id}`} className="underline">
                  {p.name} · {p.orderNumber}
                </Link>{" "}
                <span className="text-muted">({SERVICE_STATUS[p.status].label.toLowerCase()})</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-muted">We review what you&apos;ve paid and what&apos;s done, then send an itemised quote. Nothing is charged twice.</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {order.status === "requirements_pending" && cat && (
            <section className="card space-y-6">
              <div>
                <h2 className="text-lg">Your requirements</h2>
                <p className="mt-1 text-sm text-muted">
                  We check these and your files before quoting. Work starts once payment and complete requirements are received.
                </p>
              </div>
              <RequirementUploads orderId={order.id} />
              <RequirementsForm orderId={order.id} required={cat.requires ?? []} values={reqs} rightsConfirmed={order.rights_confirmed} />
            </section>
          )}

          {openQuote && (
            <section className="card ring-2 ring-gold" aria-labelledby="quote-heading">
              <h2 id="quote-heading" className="text-lg">
                {openQuote.kind === "additional" ? "Quote for additional work" : "Your quote"}
              </h2>
              <dl className="mt-3 space-y-1 text-sm">
                {((openQuote.line_items as QuoteLine[] | null) ?? []).map((l) => (
                  <Row key={l.label} k={l.label} v={l.amount_paise < 0 ? `− ${formatPaise(-l.amount_paise)}` : formatPaise(l.amount_paise)} />
                ))}
                <Row k={openQuote.line_items ? "Price after credits" : "Price"} v={formatPaise(openQuote.base_paise)} />
                <Row k={`GST (${Number(openQuote.gst_percent)}%)`} v={formatPaise(openQuote.gst_paise)} />
                <Row k="Total to pay" v={formatPaise(openQuote.total_paise)} strong />
                <Row k="Revisions included" v={String(openQuote.revisions)} />
                <Row k="Delivery by" v={new Date(openQuote.delivery_by).toLocaleDateString("en-IN", { dateStyle: "long" })} />
              </dl>
              <h3 className="mt-4 text-sm font-semibold">Deliverables</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {openQuote.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              {openQuote.notes && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">{openQuote.notes}</p>}
              {cat && (cat.exclusions ?? []).length > 0 && (
                <p className="mt-3 text-xs text-muted">Not included: {cat.exclusions!.join("; ")}.</p>
              )}
              <p className="mt-2 text-xs text-muted">
                The delivery date counts from when we receive payment and complete requirements. Extra changes beyond the included revisions need a new quote you
                accept first. No surprise charges.
              </p>
              <div className="mt-4">
                <QuoteActions quoteId={openQuote.id} status={openQuote.status} totalLabel={formatPaise(openQuote.total_paise)} />
              </div>
            </section>
          )}

          {order.status === "author_review" && (
            <section className="card" aria-labelledby="review-heading">
              <h2 id="review-heading" className="text-lg">
                Review the delivered files
              </h2>
              <p className="mt-1 mb-4 text-sm text-muted">Download the files below and check them carefully before approving.</p>
              <ReviewActions orderId={order.id} revisionsLeft={Math.max(0, order.revisions_allowed - order.revisions_used)} />
            </section>
          )}

          {delivered.length > 0 && (
            <section className="card">
              <h2 className="text-lg">Delivered files</h2>
              <FileList files={delivered} />
              {order.qc && <p className="mt-3 text-xs text-success">Final print files passed our quality check (dimensions, bleed, spine, fonts, images, licences).</p>}
            </section>
          )}

          <section className="card">
            <h2 className="text-lg">History</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <p className="text-xs text-muted">{fmt(e.created_at)}</p>
                  <p>{e.note ?? (e.to_status ? SERVICE_STATUS[e.to_status].label : "")}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          {portfolio && (
            <section className="card space-y-2">
              <h2 className="text-lg">Sample work</h2>
              <SampleGallery title={name} samples={portfolio.samples} />
              <p className="text-xs text-muted">{SAMPLE_LABEL}</p>
            </section>
          )}
          {canUpgrade && (
            <section className="card space-y-2">
              <h2 className="text-lg">Want the full bundle?</h2>
              <p className="text-sm text-muted">
                Upgrade to the Book Design & Launch Bundle (cover, formatting and launch kit). We review what you&apos;ve paid for and what&apos;s done, then send an
                itemised quote for the difference.
              </p>
              <UpgradeToBundle orderId={order.id} />
            </section>
          )}
          <section className="card text-sm">
            <h2 className="mb-2 text-lg">Details</h2>
            <dl className="space-y-1">
              {REQUIREMENT_FIELDS.filter((f) => reqs[f.key]).map((f) => (
                <div key={f.key}>
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="break-words whitespace-pre-line">{reqs[f.key]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-muted">
              Revisions: {order.revisions_used} used of {order.revisions_allowed}
            </p>
          </section>
          {uploaded.length > 0 && (
            <section className="card">
              <h2 className="text-lg">Your uploads</h2>
              <FileList files={uploaded} />
            </section>
          )}
          {canCancel && (
            <section className="card">
              <CancelService orderId={order.id} paid={paid} />
              <p className="mt-2 text-xs text-muted">
                Free to cancel before paying. After paying, you can cancel for a full refund until work starts. After that, contact us.
              </p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-1 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function FileList({ files }: { files: { id: string; file_name: string; kind: string; version: number; url: string | null; created_at: string }[] }) {
  return (
    <ul className="mt-3 divide-y divide-line text-sm">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            {f.file_name}
            <span className="ml-2 text-xs text-muted">
              {f.kind} v{f.version}
            </span>
          </span>
          {f.url && (
            <a href={f.url} className="font-medium underline" target="_blank" rel="noreferrer">
              Download
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
