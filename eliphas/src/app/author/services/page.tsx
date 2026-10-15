import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ServiceStatusBadge } from "@/components/ServiceStatusBadge";
import { requireRole } from "@/lib/auth";
import { formatPaise, withGst } from "@/lib/commission";
import { proStatus } from "@/lib/plans";
import { AUTHOR_ACTION_STATUSES } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { StartService } from "./StartService";

export const metadata: Metadata = { title: "Author services" };

export default async function ServicesPage() {
  const profile = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  const [{ data: catalog }, { data: orders }, pro] = await Promise.all([
    admin.from("current_service_catalog").select("*").eq("active", true).order("sort"),
    admin.from("service_orders").select("id, order_number, kind, status, created_at, requirements, service_catalog(name)").eq("author_id", profile.id).order("created_at", { ascending: false }),
    proStatus(profile.id),
  ]);

  return (
    <>
      <PageHeader
        title="Author services"
        intro="Optional, one-time help from our team. You never need these to publish. Prices exclude GST; you see the full total before paying."
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

      <div className="grid gap-4 md:grid-cols-2">
        {(catalog ?? []).map((c) => {
          const price =
            c.pricing === "fixed"
              ? `${formatPaise(c.price_paise!)} + GST (${formatPaise(withGst(c.price_paise!, Number(c.gst_percent)).totalPaise)} total)`
              : `${formatPaise(c.min_paise!)}–${formatPaise(c.max_paise!)} + GST · fixed quote after review`;
          return (
            <section key={c.id} className="card flex flex-col">
              <h2 className="text-lg">{c.name}</h2>
              <p className="mt-1 font-semibold">{price}</p>
              <p className="mt-3 text-sm text-muted">{c.scope}</p>
              <h3 className="mt-4 text-sm font-semibold">Included</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {(c.deliverables ?? []).map((d) => (
                  <li key={d}>{d}</li>
                ))}
                <li>
                  {c.revision_rounds} revision round{c.revision_rounds === 1 ? "" : "s"}
                </li>
              </ul>
              {(c.exclusions ?? []).length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold">Not included</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                    {c.exclusions!.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-auto pt-5">
                <StartService code={c.code!} label="Start request" />
                <p className="mt-2 text-xs text-muted">No payment now. We review your files and send a fixed quote first.</p>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
