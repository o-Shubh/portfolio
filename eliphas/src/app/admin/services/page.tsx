import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ServiceStatusBadge } from "@/components/ServiceStatusBadge";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import type { ServiceStatus } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { CatalogForm } from "./CatalogForm";

export const metadata: Metadata = { title: "Services" };

const TABS: { key: string; label: string; statuses: ServiceStatus[] }[] = [
  { key: "review", label: "Needs quote", statuses: ["scope_review"] },
  { key: "work", label: "To do", statuses: ["queued", "in_progress", "revision_requested"] },
  { key: "author", label: "With author", statuses: ["requirements_pending", "quote_awaiting_acceptance", "payment_pending", "author_review"] },
  { key: "done", label: "Done", statuses: ["completed", "cancelled", "refunded"] },
];

export default async function AdminServicesPage({ searchParams }: PageProps<"/admin/services">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const db = createAdminClient();
  const [{ data: orders }, { data: catalog }] = await Promise.all([
    db
      .from("service_orders")
      .select("id, order_number, kind, status, created_at, updated_at, requirements, profiles!service_orders_author_id_fkey(full_name), service_catalog(name)")
      .in("status", tab.statuses)
      .order("updated_at", { ascending: true }),
    db.from("current_service_catalog").select("*").order("sort"),
  ]);

  return (
    <>
      <PageHeader title="Author services" intro="Manual fulfilment queue. Oldest first." />
      <nav aria-label="Queue" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/services?tab=${t.key}`}
            aria-current={t.key === tab.key ? "true" : undefined}
            className="chip bg-surface"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {!orders?.length ? (
        <div className="card mb-10 text-muted">Nothing here.</div>
      ) : (
        <ul className="mb-10 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/services/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 hover:shadow-lift">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {o.kind === "pro_creative" ? "Pro creative" : o.service_catalog?.name} · {(o.requirements as { title?: string }).title ?? "Untitled"}
                  </span>
                  <span className="block text-sm text-muted">
                    <span className="id-mono">{o.order_number}</span> · {o.profiles?.full_name} · updated {new Date(o.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                </span>
                <ServiceStatusBadge status={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-1 text-xl">Catalogue</h2>
      <p className="mb-4 text-sm text-muted">Saving creates a new version for future orders. Orders already placed keep the version and price they were quoted on.</p>
      <div className="space-y-4">
        {(catalog ?? []).map((c) => (
          <details key={c.code} className="card">
            <summary className="cursor-pointer font-medium">
              {c.name} · v{c.version} ·{" "}
              {c.pricing === "fixed" ? formatPaise(c.price_paise!) : `${formatPaise(c.min_paise!)}–${formatPaise(c.max_paise!)}`} + GST
              {!c.active && <span className="ml-2 text-xs text-muted">(hidden)</span>}
            </summary>
            <div className="mt-4">
              <CatalogForm
                item={{
                  code: c.code!,
                  version: c.version!,
                  name: c.name!,
                  pricing: c.pricing!,
                  price_paise: c.price_paise,
                  min_paise: c.min_paise,
                  max_paise: c.max_paise,
                  gst_percent: Number(c.gst_percent),
                  revision_rounds: c.revision_rounds!,
                  deliverables: c.deliverables ?? [],
                  scope: c.scope!,
                  exclusions: c.exclusions ?? [],
                  active: Boolean(c.active),
                }}
              />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
