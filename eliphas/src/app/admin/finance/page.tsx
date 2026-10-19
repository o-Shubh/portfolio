import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { rupees } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Finance" };

type F = Record<string, number>;

/** "2026-10": the current month in India */
function currentIstMonth() {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 7);
}

export default async function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  // Months run midnight to midnight in India. Work from year and month numbers so the server's time zone can't shift them.
  const month = typeof sp.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : currentIstMonth();
  const [year, mon] = month.split("-").map(Number);
  const ym = (offset: number) => {
    const d = new Date(Date.UTC(year, mon - 1 + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const startOf = (key: string) => new Date(`${key}-01T00:00:00+05:30`);
  const from = startOf(month);
  const to = startOf(ym(1));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_finance", { p_from: from.toISOString(), p_to: to.toISOString() });
  const f = (data ?? {}) as F;
  const n = (k: string) => Number(f[k] ?? 0);
  const { data: payments } = await createAdminClient()
    .from("payments")
    .select("id, description, amount_paise, base_paise, gst_paise, refunded_paise, status, mode, paid_at, purpose")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });
  const label = (key: string, style: "long" | "short") => startOf(key).toLocaleDateString("en-IN", { month: style, year: "numeric", timeZone: "Asia/Kolkata" });

  const groups: { title: string; note?: string; rows: [string, number][] }[] = [
    {
      title: "Book sales (passes through us)",
      note: "Book sales value is the books at full price (readers paid less where an invite discount or credit was used; see below). It is not platform income.",
      rows: [
        ["Book sales value", n("book_sales_value")],
        ["Print costs (owed to printers)", n("print_costs")],
        ["Author earnings (owed to authors)", n("author_earnings")],
        ["Payment gateway costs", n("gateway_costs")],
      ],
    },
    {
      title: "Platform income",
      rows: [
        ["Commission (excl. GST)", n("commission")],
        ["GST collected on commission", n("commission_gst")],
        ["Service revenue (excl. GST)", n("service_revenue")],
        ["GST on services", n("service_gst")],
        ["Pro subscriptions (excl. GST)", n("subscription_revenue")],
        ["GST on subscriptions", n("subscription_gst")],
      ],
    },
    {
      title: "Shipping and refunds",
      rows: [
        ["Shipping collected from readers", n("shipping_collected")],
        ["Shipping promotions (platform-funded)", n("shipping_promotions")],
        ["Invite discounts and credit (platform-funded)", n("platform_discounts")],
        ["Book order refunds", n("book_refunds")],
        ["Service and subscription refunds", n("other_refunds")],
      ],
    },
    { title: "Balances (all time)", rows: [["Owed to authors now", n("author_liability")]] },
  ];

  return (
    <>
      <PageHeader title="Finance" intro="Each figure is kept separately. GST figures are as configured and need your accountant's review." />
      <nav aria-label="Month" className="mb-6 flex items-center gap-3 text-sm">
        <Link href={`/admin/finance?month=${ym(-1)}`} className="btn-ghost px-3" aria-label={`Previous month, ${label(ym(-1), "long")}`}>
          ← {label(ym(-1), "short")}
        </Link>
        <span className="font-semibold">{label(month, "long")}</span>
        <Link href={`/admin/finance?month=${ym(1)}`} className="btn-ghost px-3" aria-label={`Next month, ${label(ym(1), "long")}`}>
          {label(ym(1), "short")} →
        </Link>
      </nav>
      {error && <p className="card mb-6 text-danger">Could not load figures.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title} className="card">
            <h2 className="text-lg">{g.title}</h2>
            {g.note && <p className="mt-1 text-xs text-muted">{g.note}</p>}
            <dl className="mt-3 divide-y divide-line text-sm">
              {g.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium mono">{rupees(Math.round(v * 100) / 100, true)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <h2 className="mt-10 mb-3 text-xl">Service and subscription payments</h2>
      {!payments?.length ? (
        <div className="card text-muted">None this month.</div>
      ) : (
        <div className="card overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-muted">
              <tr>
                <th className="p-3 font-medium">For</th>
                <th className="p-3 text-right font-medium">Base</th>
                <th className="p-3 text-right font-medium">GST</th>
                <th className="p-3 text-right font-medium">Refunded</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    {p.description} {p.mode === "mock" && <span className="text-xs text-muted">(test)</span>}
                  </td>
                  <td className="p-3 text-right mono">{formatPaise(p.base_paise, true)}</td>
                  <td className="p-3 text-right mono">{formatPaise(p.gst_paise, true)}</td>
                  <td className="p-3 text-right mono">{p.refunded_paise ? formatPaise(p.refunded_paise, true) : "—"}</td>
                  <td className="p-3">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
