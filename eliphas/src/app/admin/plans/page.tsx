import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { getCommissionTerms, getTaxSettings } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { PlanVersionForm, TermsTaxForm } from "./PlanForms";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data: versions }, terms, tax] = await Promise.all([
    supabase.from("plan_versions").select("*").order("plan").order("version", { ascending: false }),
    getCommissionTerms(),
    getTaxSettings(),
  ]);
  const now = new Date().getTime();
  return (
    <>
      <PageHeader title="Plans and commission" intro="Every change is a new version with an effective date. History is never rewritten." />
      <div className="card mb-6 overflow-x-auto p-0 md:p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface-2 text-muted">
            <tr>
              <th className="p-3 font-medium">Plan</th>
              <th className="p-3 font-medium">Price / month</th>
              <th className="p-3 font-medium">Commission</th>
              <th className="p-3 font-medium">GST</th>
              <th className="p-3 font-medium">Credits</th>
              <th className="p-3 font-medium">Effective</th>
              <th className="p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(versions ?? []).map((v) => (
              <tr key={v.id}>
                <td className="p-3 font-medium">
                  {v.plan} v{v.version}
                </td>
                <td className="p-3 mono">{v.price_paise ? formatPaise(v.price_paise, true) : "—"}</td>
                <td className="p-3 mono">
                  {Number(v.commission_percent)}%, min {formatPaise(v.commission_min_paise, true)}
                </td>
                <td className="p-3">{Number(v.commission_gst_percent)}%</td>
                <td className="p-3">{v.credits_per_period}</td>
                <td className="p-3 whitespace-nowrap">
                  {new Date(v.effective_from).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  {new Date(v.effective_from).getTime() > now && <span className="ml-1 text-xs text-accent-fg">upcoming</span>}
                </td>
                <td className="p-3 text-muted">{v.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-6">
        <TermsTaxForm terms={terms} tax={tax} />
        <PlanVersionForm />
      </div>
    </>
  );
}
