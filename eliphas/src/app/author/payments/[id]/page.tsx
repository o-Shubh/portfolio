import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { getTaxSettings } from "@/lib/plans";
import { getBusiness } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Receipt" };

/**
 * Receipt for a Pro or service payment. It is titled "Tax invoice" only when the business has a
 * GSTIN and GST registration configured; otherwise it is a payment receipt.
 */
export default async function ReceiptPage({ params }: PageProps<"/author/payments/[id]">) {
  const profile = await requireRole(["author", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
  if (!p || !p.receipt_number) notFound();
  const [biz, tax] = await Promise.all([getBusiness(), getTaxSettings()]);
  const taxInvoice = tax.gst_registered && Boolean(biz.gstin);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card space-y-6 print:shadow-none print:ring-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-2xl">{taxInvoice ? "Tax invoice" : "Payment receipt"}</h1>
            <p className="text-sm text-muted">No. {p.receipt_number}</p>
            <p className="text-sm text-muted">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{biz.legal_name || "Eliphas Indicus Publications"}</p>
            {biz.address && <p className="whitespace-pre-line text-muted">{biz.address}</p>}
            {biz.gstin && <p className="text-muted">GSTIN {biz.gstin}</p>}
          </div>
        </div>
        <div className="text-sm">
          <p className="text-muted">Billed to</p>
          <p className="font-medium">{profile.full_name}</p>
          <p className="text-muted">
            {profile.city}
            {profile.state && `, ${profile.state}`}
          </p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-2">{p.description}</td>
              <td className="py-2 text-right mono">{formatPaise(p.base_paise)}</td>
            </tr>
            <tr>
              <td className="py-2 text-muted">GST ({Number(p.gst_percent)}%)</td>
              <td className="py-2 text-right mono">{formatPaise(p.gst_paise)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-2">Total paid</td>
              <td className="py-2 text-right mono">{formatPaise(p.amount_paise)}</td>
            </tr>
            {p.refunded_paise > 0 && (
              <tr>
                <td className="py-2 text-muted">Refunded</td>
                <td className="py-2 text-right mono">− {formatPaise(p.refunded_paise)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-xs text-muted">
          Paid by {p.mode === "razorpay" ? "Razorpay" : "test payment"}
          {p.razorpay_payment_id && ` · ${p.razorpay_payment_id}`}.{" "}
          {!taxInvoice && "This is a payment receipt, not a GST tax invoice."}
        </p>
      </div>
      <div className="mt-4 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
