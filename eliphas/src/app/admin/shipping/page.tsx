import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { createAdminClient } from "@/lib/supabase/admin";
import { EndPromotion, PromotionForm, ZoneForm } from "./ShippingForms";

export const metadata: Metadata = { title: "Shipping" };

export default async function ShippingAdmin() {
  await requireRole(["admin"]);
  const db = createAdminClient();
  const [{ data: zones }, { data: rates }, { data: promos }] = await Promise.all([
    db.from("shipping_zones").select("*").order("created_at"),
    db.from("shipping_rates").select("*").order("max_weight_g"),
    db.from("shipping_promotions").select("*").order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader
        title="Shipping rates"
        intro="Readers see the shipping charge for their PIN code before paying. The zone with the longest matching PIN prefix wins; PIN codes with no zone can't order. Enter your courier's real rates; no courier quotes are made up."
      />
      {zones?.some((z) => z.is_sample && z.active) && (
        <p role="note" className="card mb-6 ring-2 ring-gold">
          Sample shipping rates are active. Replace them with your courier&apos;s rates before launch.
        </p>
      )}
      <div className="space-y-4">
        {(zones ?? []).map((z) => (
          <details key={z.id} className="card" open={zones!.length === 1}>
            <summary className="cursor-pointer font-medium">
              {z.name} {!z.active && "(off)"} {z.is_sample && <span className="text-xs text-accent-fg">sample</span>} ·{" "}
              {(rates ?? [])
                .filter((r) => r.zone_id === z.id)
                .map((r) => `≤${r.max_weight_g} g ${formatPaise(r.price_paise)}`)
                .join(", ")}
            </summary>
            <div className="mt-4">
              <ZoneForm
                zone={{
                  id: z.id,
                  name: z.name,
                  prefixes: z.pincode_prefixes,
                  extra: z.extra_per_500g_paise,
                  active: z.active,
                  is_sample: z.is_sample,
                  slabs: (rates ?? []).filter((r) => r.zone_id === z.id).map((r) => ({ w: r.max_weight_g, p: r.price_paise })),
                }}
              />
            </div>
          </details>
        ))}
        <details className="card">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Add a zone</summary>
          <div className="mt-4">
            <ZoneForm zone={null} />
          </div>
        </details>
      </div>

      <h2 className="mt-10 mb-3 text-xl">Promotions</h2>
      <div className="card mb-4">
        <PromotionForm />
      </div>
      <ul className="space-y-2">
        {(promos ?? []).map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              <strong>{p.name}</strong> · {p.kind === "free" ? "free shipping" : `${formatPaise(p.amount_paise)} off`}
              {p.min_books_paise > 0 && ` above ${formatPaise(p.min_books_paise)}`} · {new Date(p.starts_at).toLocaleDateString("en-IN")} →{" "}
              {p.ends_at ? new Date(p.ends_at).toLocaleDateString("en-IN") : "no end"} {!p.active && "(ended)"}
            </span>
            {p.active && <EndPromotion id={p.id} />}
          </li>
        ))}
      </ul>
    </>
  );
}
