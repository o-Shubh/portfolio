import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { amountInWords, taxColumns, type InvoiceLine, type InvoiceParty } from "@/lib/invoice-format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });
const money = (paise: number) => formatPaise(paise, true);

/**
 * An invoice or credit note, laid out as a paper document (always light, A4-friendly). "Print or save as PDF" uses
 * the browser, so Hindi titles print correctly. Readable by the buyer and by admins (row-level security).
 */
export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: original }, { data: notes }] = await Promise.all([
    inv.original_invoice_id
      ? supabase.from("invoices").select("id, number, issued_at").eq("id", inv.original_invoice_id).maybeSingle()
      : Promise.resolve({ data: null }),
    inv.kind === "invoice"
      ? supabase.from("invoices").select("id, number, issued_at, total_paise").eq("original_invoice_id", inv.id).order("issued_at")
      : Promise.resolve({ data: [] }),
  ]);

  const seller = inv.seller as InvoiceParty;
  const buyer = inv.buyer as InvoiceParty;
  const lines = inv.lines as InvoiceLine[];
  const tax = taxColumns({ inter_state: inv.inter_state, lines });
  const credit = inv.kind === "credit_note";
  const back =
    profile.role === "admin"
      ? "/admin/invoices"
      : inv.order_id
        ? `/account/orders/${inv.order_id}`
        : "/author/payments";

  return (
    <main className="min-h-screen bg-surface-2 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[52rem] flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={back} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Link>
        <PrintButton label="Print or save as PDF" />
      </div>

      <article
        data-testid="invoice"
        className="mx-auto max-w-[52rem] rounded-[var(--radius-card)] bg-white p-5 text-[13px] leading-relaxed text-[#1d1d1f] shadow-sm ring-1 ring-black/5 sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0"
      >
        {inv.is_test && (
          <p className="mb-4 rounded bg-[#fff4d6] px-3 py-2 text-center text-xs font-semibold tracking-wide text-[#6b4500] uppercase">
            Test document: made with a test payment, not a real sale
          </p>
        )}

        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-5">
          <div className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full.png" alt="" className="h-10 w-auto" />
            <p className="pt-2 text-sm font-semibold">{seller.legal_name}</p>
            {seller.address && <p className="max-w-xs whitespace-pre-line text-[#55575d]">{seller.address}</p>}
            {seller.state && (
              <p className="text-[#55575d]">
                State: {seller.state}
                {seller.state_code && ` (${seller.state_code})`}
              </p>
            )}
            {seller.gstin && <p className="font-medium">GSTIN {seller.gstin}</p>}
            <p className="text-[#55575d]">{[seller.email, seller.phone].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="space-y-1 sm:text-right">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="invoice-title">
              {inv.title}
            </h1>
            <p>
              No. <span className="font-mono font-medium" data-testid="invoice-number">{inv.number}</span>
            </p>
            <p className="text-[#55575d]">Date {date(inv.issued_at)}</p>
            {original && (
              <p className="text-[#55575d]">
                Against invoice <span className="font-mono">{original.number}</span> of {date(original.issued_at)}
              </p>
            )}
            {buyer.order_number && (
              <p className="text-[#55575d]">
                Order <span className="font-mono">{buyer.order_number}</span>
              </p>
            )}
          </div>
        </header>

        <section className="grid gap-5 border-b border-black/10 py-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-[#55575d] uppercase">{inv.order_id ? "Billed and shipped to" : "Billed to"}</p>
            <p className="mt-1 font-medium">{buyer.name || "—"}</p>
            {buyer.address && <p>{buyer.address}</p>}
            {(buyer.city || buyer.pincode) && <p>{[buyer.city, buyer.pincode].filter(Boolean).join(" ")}</p>}
            {buyer.state && <p>{buyer.state}</p>}
            {buyer.gstin && <p className="font-medium">GSTIN {buyer.gstin}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold tracking-wider text-[#55575d] uppercase">Place of supply</p>
            <p className="mt-1">
              {inv.place_of_supply ?? "—"}
              {buyer.state_code && ` (${buyer.state_code})`}
            </p>
            {credit && inv.reason && (
              <>
                <p className="mt-3 text-[11px] font-semibold tracking-wider text-[#55575d] uppercase">Reason</p>
                <p className="mt-1">{inv.reason}</p>
              </>
            )}
          </div>
        </section>

        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="mt-5 w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/15 text-[11px] tracking-wider text-[#55575d] uppercase">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Description</th>
                <th className="py-2 pr-2 font-semibold">HSN/SAC</th>
                <th className="py-2 pr-2 text-right font-semibold">Qty</th>
                <th className="py-2 pr-2 text-right font-semibold">Rate</th>
                <th className="py-2 pr-2 text-right font-semibold">Discount</th>
                <th className="py-2 pr-2 text-right font-semibold">Taxable value</th>
                {tax === "cgst_sgst" && (
                  <>
                    <th className="py-2 pr-2 text-right font-semibold">CGST</th>
                    <th className="py-2 pr-2 text-right font-semibold">SGST</th>
                  </>
                )}
                {tax === "igst" && <th className="py-2 pr-2 text-right font-semibold">IGST</th>}
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-black/5 align-top">
                  <td className="py-2 pr-2 text-[#55575d]">{i + 1}</td>
                  <td className="py-2 pr-2" lang="und">
                    {l.description}
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs">{l.code ?? "—"}</td>
                  <td className="py-2 pr-2 text-right">{l.quantity}</td>
                  <td className="py-2 pr-2 text-right">{money(l.unit_paise)}</td>
                  <td className="py-2 pr-2 text-right">{l.discount_paise ? `− ${money(l.discount_paise)}` : "—"}</td>
                  <td className="py-2 pr-2 text-right">{money(l.taxable_paise)}</td>
                  {tax === "cgst_sgst" && (
                    <>
                      <td className="py-2 pr-2 text-right">
                        {money(l.cgst_paise)}
                        <span className="block text-[11px] text-[#55575d]">{l.rate / 2}%</span>
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {money(l.sgst_paise)}
                        <span className="block text-[11px] text-[#55575d]">{l.rate / 2}%</span>
                      </td>
                    </>
                  )}
                  {tax === "igst" && (
                    <td className="py-2 pr-2 text-right">
                      {money(l.igst_paise)}
                      <span className="block text-[11px] text-[#55575d]">{l.rate}%</span>
                    </td>
                  )}
                  <td className="py-2 text-right">{money(l.total_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-5 flex flex-wrap justify-between gap-6">
          <p className="max-w-sm self-end text-[#55575d]" data-testid="invoice-words">
            {amountInWords(inv.total_paise)}
          </p>
          <dl className="w-full max-w-xs space-y-1 tabular-nums">
            <Row k="Taxable value" v={money(inv.taxable_paise)} />
            {tax === "cgst_sgst" && (
              <>
                <Row k="CGST" v={money(inv.cgst_paise)} />
                <Row k="SGST" v={money(inv.sgst_paise)} />
              </>
            )}
            {tax === "igst" && <Row k="IGST" v={money(inv.igst_paise)} />}
            <div className="flex justify-between border-t border-black/15 pt-2 text-base font-semibold">
              <dt>{credit ? "Total credited" : "Total"}</dt>
              <dd data-testid="invoice-total">{money(inv.total_paise)}</dd>
            </div>
            {inv.credit_paise > 0 && <Row k={credit ? "Returned to Eliphas credit" : "Paid with Eliphas credit"} v={money(inv.credit_paise)} />}
            {inv.paid_paise > 0 && <Row k={credit ? "Refunded to your payment method" : "Paid online"} v={money(inv.paid_paise)} />}
          </dl>
        </section>

        <footer className="mt-8 space-y-1 border-t border-black/10 pt-4 text-xs text-[#55575d]">
          {inv.payment_reference && <p>Payment reference: {inv.payment_reference}</p>}
          {tax === "none" && (
            <p>{inv.gst_registered ? "No GST is charged on the items in this document." : `${seller.legal_name} is not registered under GST, so no GST is charged.`}</p>
          )}
          {inv.footer_note && <p className="whitespace-pre-line">{inv.footer_note}</p>}
          {(notes ?? []).map((n) => (
            <p key={n.id}>
              Credit note <span className="font-mono">{n.number}</span> of {date(n.issued_at)} for {money(n.total_paise)} was issued against this invoice.
            </p>
          ))}
          <p>This is a computer-generated document and does not need a signature.</p>
        </footer>
      </article>

      {(notes ?? []).length > 0 && (
        <ul className="mx-auto mt-4 max-w-[52rem] space-y-1 text-sm print:hidden">
          {(notes ?? []).map((n) => (
            <li key={n.id}>
              <Link href={`/invoices/${n.id}`} className="font-semibold text-accent-fg hover:underline">
                View credit note {n.number}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#55575d]">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
