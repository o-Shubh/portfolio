import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ServiceStatusBadge } from "@/components/ServiceStatusBadge";
import { requireRole } from "@/lib/auth";
import { proStatus } from "@/lib/plans";
import { ServiceCard } from "@/components/ServiceCard";
import { AUTHOR_ACTION_STATUSES, BUNDLE_CODE, BUNDLE_PARTS, OPEN_SERVICE_STATUSES, type CatalogItem } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { StartService } from "./StartService";

export const metadata: Metadata = { title: "Author services" };

export default async function ServicesPage() {
  const profile = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  const [{ data: catalog }, { data: orders }, pro] = await Promise.all([
    admin.from("current_service_catalog").select("*").eq("active", true).order("sort"),
    admin.from("service_orders").select("id, order_number, kind, status, created_at, requirements, service_catalog(name, code)").eq("author_id", profile.id).order("created_at", { ascending: false }),
    proStatus(profile.id),
  ]);

  return (
    <>
      <PageHeader
        title="Author services"
        intro="Optional, one-time help from our team. You never need these to publish. Prices exclude GST; you see the full total before paying. For a book you’re already setting up, add services from its Files or Submit step and we’ll use its details and files."
      />

      {orders && orders.length > 0 && (
        <section className="card mb-8" aria-labelledby="mine-heading">
          <h2 id="mine-heading" className="text-lg">
            Your requests
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/author/services/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <span className="block font-medium">{o.kind === "pro_creative" ? "Pro creative" : o.service_catalog?.name}</span>
                    <span className="block text-sm text-muted">
                      {o.order_number} · {(o.requirements as { title?: string }).title ?? "Untitled"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {AUTHOR_ACTION_STATUSES.includes(o.status) && <span className="text-xs font-semibold text-accent-fg">Action needed</span>}
                    <ServiceStatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pro.active && (
        <div className="card mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg">Pro promotional creatives</h2>
            <p className="text-sm text-muted">
              {pro.credits} of your Pro credits left this period. Separate from paid services: buying a Launch Kit doesn&apos;t use them.
            </p>
          </div>
          <Link href="/author/creatives/new" className="btn-primary">
            Request a creative
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {(catalog ?? []).map((c) => {
          const existing = (orders ?? []).find((o) => o.service_catalog?.code === c.code && OPEN_SERVICE_STATUSES.includes(o.status));
          const hasPart = (orders ?? []).some((o) => BUNDLE_PARTS.includes(o.service_catalog?.code ?? "") && !["cancelled", "refunded"].includes(o.status));
          return (
            <ServiceCard
              key={c.id}
              item={c as CatalogItem}
              headingLevel={2}
              actions={
                <>
                  <StartService code={c.code!} label="Start request" />
                  {existing && (
                    <Link href={`/author/services/${existing.id}`} className="btn-ghost">
                      View existing request
                    </Link>
                  )}
                  <p className="w-full text-xs text-muted">
                    No payment now. We review your files and send a fixed quote first.
                    {c.code === BUNDLE_CODE &&
                      hasPart &&
                      " Already requested a cover, formatting or launch kit? Open that request and choose Upgrade to the bundle, so you aren't charged twice."}
                  </p>
                </>
              }
            />
          );
        })}
      </div>
    </>
  );
}
