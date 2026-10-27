import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceLinks } from "@/components/InvoiceLinks";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

const STATUS: Record<string, string> = {
  created: "Not completed",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
};

export default async function PaymentsPage() {
  await requireRole(["author", "admin"]);
  const supabase = await createClient();
  const { data: payments } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  const ids = (payments ?? []).map((p) => p.id);
  const { data: docs } = ids.length
    ? await supabase.from("invoices").select("id, number, kind, title, payment_id").in("payment_id", ids).order("issued_at")
    : { data: [] };
  return (
    <>
      <PageHeader
        title="Service payments"
        intro="What you've paid us for Pro and author services. Book royalties and payouts are under Earnings & payouts; we never take these payments out of your royalties."
      />
      {!payments?.length ? (
        <div className="card max-w-2xl text-center">
          <p className="font-medium">No payments yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">When you pay for Author Pro or a service, the payment and its invoice appear here.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/author/services" className="btn-ghost">
              Browse services
            </Link>
            <Link href="/author/plan" className="btn-ghost">
              See Author Pro
            </Link>
          </div>
        </div>
      ) : (
        <div className="ledger-wrap">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-muted">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">For</th>
                <th className="p-3 text-right font-medium">Amount</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">
                  <span className="sr-only">Invoice</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                  <td className="p-3">{p.description}</td>
                  <td className="p-3 text-right mono">{formatPaise(p.amount_paise, true)}</td>
                  <td className="p-3">
                    {STATUS[p.status]}
                    {p.refunded_paise > 0 && ` (${formatPaise(p.refunded_paise, true)} back)`}
                  </td>
                  <td className="p-3">
                    {(docs ?? []).some((d) => d.payment_id === p.id) ? (
                      <InvoiceLinks docs={(docs ?? []).filter((d) => d.payment_id === p.id)} />
                    ) : (
                      p.receipt_number && (
                        <Link href={`/author/payments/${p.id}`} className="font-medium underline">
                          Receipt
                        </Link>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
