import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { earnings, printCost, rupees } from "@/lib/pricing";
import { BUSINESS_FIELDS, getBusiness, getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { BusinessForm, RatesJsonForm, SettingsForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole(["admin"]);
  const [settings, business] = await Promise.all([getPricingSettings(), getBusiness()]);
  const supabase = await createClient();
  const [{ data: live }, { data: meta }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, mrp, page_count, trim_size, binding, interior, paper, cover_finish")
      .eq("status", "published"),
    supabase.from("settings").select("key, updated_at, profiles!settings_updated_by_fkey(full_name)").eq("key", "print_rates").single(),
  ]);

  // Live books that would lose money (or can't be priced) at the current rates
  const affected = (live ?? [])
    .map((b) => {
      const cost = b.page_count ? printCost({ ...b, page_count: b.page_count }, settings.rates) : null;
      const e = cost !== null && b.mrp !== null ? earnings(Number(b.mrp), cost, settings.fees) : null;
      return { ...b, cost, earning: e?.authorEarning ?? null };
    })
    .filter((b) => b.cost === null || b.earning === null || b.earning < 1);

  return (
    <>
      <PageHeader
        title="Settings"
        intro="Business details, print rates and fees. Changes apply straight away; past orders keep their prices."
      />
      {meta?.updated_at && (
        <p className="-mt-4 mb-6 text-sm text-muted">
          Last changed {new Date(meta.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          {meta.profiles?.full_name && ` by ${meta.profiles.full_name}`}.
        </p>
      )}

      {affected.length > 0 && (
        <div role="alert" className="card mb-6 ring-2 ring-danger/40">
          <h2 className="text-lg text-danger">Live books affected by the current rates</h2>
          <p className="mt-1 text-sm text-muted">
            These authors would earn nothing per copy, or an option they use no longer exists. Ask them to raise the
            price, or adjust the rates.
          </p>
          <ul className="mt-3 space-y-1">
            {affected.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/books/${b.id}`} className="font-medium underline">
                  {b.title}
                </Link>{" "}
                <span className="text-sm text-muted">
                  {b.cost === null ? "uses a removed option" : `MRP ${rupees(Number(b.mrp))}, print ${rupees(b.cost)}, earning ${rupees(b.earning ?? 0)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8">
        <BusinessForm fields={BUSINESS_FIELDS} values={business} />
      </div>

      <SettingsForm settings={settings} />

      <details className="card mt-8">
        <summary className="cursor-pointer text-lg font-semibold">Advanced: add or remove options</summary>
        <p className="mt-2 text-sm text-muted">
          Edit the full print rates as JSON, for example to add a new book size. Each option needs a short key, a label
          and its numbers. Books already using an option you remove will show up in the warning above.
        </p>
        <RatesJsonForm json={JSON.stringify(settings.rates, null, 2)} />
      </details>
    </>
  );
}
