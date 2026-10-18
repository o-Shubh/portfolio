import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServiceStatusBadge } from "@/components/ServiceStatusBadge";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { REQUIREMENT_FIELDS, SERVICE_STATUS } from "@/lib/services";
import { serviceFilesWithLinks } from "@/lib/service-files";
import { openUpgradeFor, upgradePriors } from "@/lib/services-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminCancel, Deliver, NoteForm, QuoteForm, SendBack, StartWork } from "./AdminServiceForms";

export const metadata: Metadata = { title: "Service order" };

export default async function AdminServiceOrder({ params }: PageProps<"/admin/services/orders/[id]">) {
  await requireRole(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data: o } = await db
    .from("service_orders")
    .select("*, service_catalog(*), profiles!service_orders_author_id_fkey(full_name, phone), books(id, title, status, page_count, manuscript_path)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const [files, { data: quotes }, { data: events }, priors, replacedBy] = await Promise.all([
    serviceFilesWithLinks(o.id),
    db.from("service_quotes").select("*").eq("service_order_id", o.id).order("issued_at", { ascending: false }),
    db.from("service_events").select("*").eq("service_order_id", o.id).order("created_at", { ascending: false }),
    upgradePriors(o),
    openUpgradeFor(o.id),
  ]);
  const cat = o.service_catalog;
  const reqs = o.requirements as Record<string, string>;
  const paidPaise = (quotes ?? []).filter((q) => q.status === "paid").reduce((a, q) => a + q.total_paise, 0);
  const terminal = ["completed", "cancelled", "refunded"].includes(o.status);
  const hint =
    cat?.pricing === "fixed"
      ? `Catalogue price ${formatPaise(cat.price_paise!)} + GST. If the manuscript exceeds scope (e.g. more than 200 pages for the bundle), set a revised price and explain why.`
      : cat
        ? `Catalogue range ${formatPaise(cat.min_paise!)}–${formatPaise(cat.max_paise!)} + GST. Quote a fixed price after checking the files.`
        : "";

  return (
    <>
      <Link href="/admin/services" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Services
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{o.kind === "pro_creative" ? "Pro creative" : cat?.name}</h1>
        <ServiceStatusBadge status={o.status} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {o.order_number} · {o.profiles?.full_name} · catalogue v{cat?.version ?? "—"} · revisions {o.revisions_used}/{o.revisions_allowed}
        {paidPaise > 0 && ` · paid ${formatPaise(paidPaise)}`}
      </p>
      {o.books && (
        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          For the book{" "}
          <Link href={`/admin/books/${o.books.id}`} className="font-semibold underline">
            {o.books.title}
          </Link>
          {o.books.page_count ? ` · ${o.books.page_count} pages` : ""}
          {o.books.manuscript_path ? " · manuscript uploaded (download it from the book page)" : " · no manuscript uploaded yet"}
        </p>
      )}

      {replacedBy && (
        <p className="mt-2 rounded-lg bg-accent/15 px-3 py-2 text-sm">
          Being replaced by bundle upgrade{" "}
          <Link href={`/admin/services/orders/${replacedBy.id}`} className="font-semibold underline">
            {replacedBy.order_number}
          </Link>
          . Don&apos;t quote or charge this request separately.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {priors.length > 0 && (
            <section className="card" aria-labelledby="upgrade-heading">
              <h2 id="upgrade-heading" className="text-lg">
                Bundle upgrade: requests it replaces
              </h2>
              <p className="mt-1 text-sm text-muted">
                Review what was paid and what&apos;s already delivered. Credit paid work only as far as it&apos;s useful to the bundle; nothing is credited
                automatically. Unpaid requests close when the bundle is paid.
              </p>
              <ul className="mt-3 divide-y divide-line text-sm">
                {priors.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/admin/services/orders/${p.id}`} className="font-medium underline-offset-2 hover:underline">
                      {p.name} · {p.orderNumber}
                    </Link>
                    <span className="flex items-center gap-2">
                      <span className="mono text-muted">{p.paidPaise ? `paid ${formatPaise(p.paidPaise)} + GST` : "not paid"}</span>
                      <ServiceStatusBadge status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {o.status === "scope_review" && (
            <section className="card space-y-6">
              <h2 className="text-lg">Issue a fixed quote</h2>
              <QuoteForm
                orderId={o.id}
                kind="initial"
                defaults={{
                  price: cat?.pricing === "fixed" ? String(cat.price_paise! / 100) : "",
                  gst: Number(cat?.gst_percent ?? 18),
                  revisions: cat?.revision_rounds ?? 0,
                  deliverables: cat?.deliverables ?? [],
                  hint,
                }}
                priors={priors.map((p) => ({ id: p.id, label: `${p.name} ${p.orderNumber}`, paidPaise: p.paidPaise }))}
              />
              <SendBack orderId={o.id} />
            </section>
          )}
          {(o.status === "queued" || o.status === "revision_requested") && (
            <section className="card">
              <h2 className="mb-3 text-lg">{o.status === "queued" ? "Ready to start" : "Revision requested"}</h2>
              <StartWork orderId={o.id} />
            </section>
          )}
          {o.status === "in_progress" && (
            <section className="card">
              <h2 className="mb-3 text-lg">Deliver</h2>
              <Deliver orderId={o.id} needsQc={o.kind === "service"} />
            </section>
          )}
          {["author_review", "completed"].includes(o.status) && o.kind === "service" && (
            <details className="card">
              <summary className="cursor-pointer font-medium">Quote additional work (author must accept and pay first)</summary>
              <div className="mt-4">
                <QuoteForm orderId={o.id} kind="additional" defaults={{ price: "", gst: Number(cat?.gst_percent ?? 18), revisions: 1, deliverables: [], hint: "Only for changes beyond the included revisions." }} />
              </div>
            </details>
          )}

          <section className="card">
            <h2 className="text-lg">Files</h2>
            {files.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No files yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {f.file_name} <span className="text-xs text-muted">{f.kind} v{f.version}</span>
                    </span>
                    {f.url && (
                      <a href={f.url} className="font-medium underline" target="_blank" rel="noreferrer">
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card space-y-4">
            <h2 className="text-lg">History</h2>
            <NoteForm orderId={o.id} />
            <ol className="space-y-3 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <p className="text-xs text-muted">
                    {new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    {e.from_status !== e.to_status && e.to_status && ` · ${e.from_status ? SERVICE_STATUS[e.from_status].label + " → " : ""}${SERVICE_STATUS[e.to_status].label}`}
                  </p>
                  <p>{e.note}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card text-sm">
            <h2 className="mb-2 text-lg">Requirements</h2>
            <p className="mb-2 text-xs">{o.rights_confirmed ? "Author confirmed rights to the content." : "Rights not confirmed yet."}</p>
            <dl className="space-y-1">
              {REQUIREMENT_FIELDS.filter((f) => reqs[f.key]).map((f) => (
                <div key={f.key}>
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="break-words whitespace-pre-line">{reqs[f.key]}</dd>
                </div>
              ))}
            </dl>
          </section>
          {(quotes ?? []).length > 0 && (
            <section className="card text-sm">
              <h2 className="mb-2 text-lg">Quotes</h2>
              <ul className="space-y-2">
                {quotes!.map((q) => (
                  <li key={q.id}>
                    {q.kind} · {formatPaise(q.total_paise)} · {q.status} · by {new Date(q.delivery_by).toLocaleDateString("en-IN")}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!terminal && (
            <section className="card">
              <h2 className="mb-2 text-lg">Cancel</h2>
              <AdminCancel orderId={o.id} paidLabel={paidPaise ? formatPaise(paidPaise) : null} />
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
