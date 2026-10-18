import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

const STATUS: Record<string, string> = { created: "Not completed", paid: "Paid", failed: "Failed", refunded: "Refunded", partially_refunded: "Partly refunded" };

export default async function PaymentsPage() {
  await requireRole(["author", "admin"]);
  const supabase = await createClient();
  const { data: payments } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  return (
    <>
      <PageHeader
        title="Payments"
        intro="What you've paid us for Pro and author services. Book royalties and payouts are under Earnings & payouts; we never take these payments out of your royalties."
      />
      {!payments?.length ? (
        <div className="card text-muted">No payments yet.</div>
      ) : (
        <div className="card overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-muted">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">For</th>
                <th className="p-3 text-right font-medium">Amount</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">
                  <span className="sr-only">Receipt</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                  <td className="p-3">{p.description}</td>
                  <td className="p-3 text-right mono">{formatPaise(p.amount_paise)}</td>
                  <td className="p-3">
                    {STATUS[p.status]}
                    {p.refunded_paise > 0 && ` (${formatPaise(p.refunded_paise)} back)`}
                  </td>
                  <td className="p-3 text-right">
                    {p.receipt_number && (
                      <Link href={`/author/payments/${p.id}`} className="font-medium underline">
                        Receipt
                      </Link>
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
