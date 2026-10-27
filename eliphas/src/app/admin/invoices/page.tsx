import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { INDIAN_STATES } from "@/lib/india";
import { monthRange, registerTotals, type InvoiceParty } from "@/lib/invoice-format";
import { getInvoicingSettings, invoiceWarnings, missingInvoices } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";
import { InvoicingForm, IssueMissingButton } from "./InvoiceForms";

export const metadata: Metadata = { title: "Invoices" };

const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const month = typeof sp.month === "string" && monthRange(sp.month) ? sp.month : thisMonth();
  const kind = sp.kind === "invoice" || sp.kind === "credit_note" ? sp.kind : "all";
  const test = sp.test === "1";
  const range = monthRange(month)!;

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("id, number, kind, title, issued_at, is_test, buyer, total_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise, order_id, payment_id")
    .gte("issued_at", range.from)
    .lt("issued_at", range.to)
    .eq("is_test", test)
    .order("issued_at", { ascending: false })
    .limit(500);
  if (kind !== "all") query = query.eq("kind", kind);
  const [{ data: rows }, warnings, missing, settings, { data: failures }] = await Promise.all([
    query,
    invoiceWarnings(),
    missingInvoices(),
    getInvoicingSettings(),
    supabase.from("invoice_failures").select("id, kind, error, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const totals = registerTotals(rows ?? []);
  const missingCount = missing.orders.length + missing.payments.length + missing.orderCredits.length + missing.paymentCredits.length;
  const qs = (extra: Record<string, string>) => new URLSearchParams({ month, kind, ...(test ? { test: "1" } : {}), ...extra }).toString();

  return (
    <>
      <PageHeader
        title="Invoices"
        intro="Every paid order and Pro or service payment gets an invoice automatically; every refund gets a credit note. Numbers run in order for each financial year. Issued documents never change."
      />

      {warnings.length > 0 && (
        <div role="alert" className="notice-warn mb-6" data-testid="invoice-warnings">
          <p className="font-semibold">Check before you rely on these invoices</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {(missingCount > 0 || (failures ?? []).length > 0) && (
        <div role="alert" className="card mb-6 space-y-3 ring-2 ring-danger/40" data-testid="invoice-missing">
          <h2 className="text-lg text-danger">Missing documents</h2>
          <p className="text-sm text-muted">
            {missingCount} paid {missingCount === 1 ? "order, payment or refund doesn't" : "orders, payments or refunds don't"} have an invoice or credit
            note yet. The payments themselves are fine.
          </p>
          {(failures ?? []).map((f) => (
            <p key={f.id} className="text-sm">
              <span className="text-muted">{new Date(f.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}:</span> {f.error}
            </p>
          ))}
          <IssueMissingButton />
        </div>
      )}

      <form action="/admin/invoices" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="month" className="label">
            Month
          </label>
          <input id="month" name="month" type="month" defaultValue={month} className="field w-auto" />
        </div>
        <div>
          <label htmlFor="kind" className="label">
            Type
          </label>
          <select id="kind" name="kind" defaultValue={kind} className="field w-auto">
            <option value="all">Invoices and credit notes</option>
            <option value="invoice">Invoices only</option>
            <option value="credit_note">Credit notes only</option>
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="test" value="1" defaultChecked={test} className="h-4 w-4 accent-fg" /> Test documents
        </label>
        <button className="btn-ghost">Show</button>
        <a href={`/admin/invoices/export?${qs({})}`} className="btn-primary ml-auto gap-2" data-testid="invoice-csv">
          <Download className="h-4 w-4" aria-hidden /> Download CSV
        </a>
      </form>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="invoice-totals">
        {[
          ["Invoices", String(totals.invoices)],
          ["Credit notes", String(totals.creditNotes)],
          ["Taxable value (net)", formatPaise(totals.taxable, true)],
          ["CGST + SGST (net)", formatPaise(totals.cgst + totals.sgst, true)],
          ["IGST (net)", formatPaise(totals.igst, true)],
          ["Total (net)", formatPaise(totals.total, true)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {!rows?.length ? (
        <div className="card text-center text-muted">No {test ? "test " : ""}documents in this month.</div>
      ) : (
        <div className="ledger-wrap">
          <table className="w-full min-w-[640px] text-left text-sm" data-testid="invoice-table">
            <thead className="border-b border-line bg-surface-2 text-muted">
              <tr>
                <th className="p-3 font-medium">Number</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Buyer</th>
                <th className="p-3 text-right font-medium">GST</th>
                <th className="p-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">
                    <Link href={`/invoices/${r.id}`} className="id-mono font-medium text-accent-fg hover:underline">
                      {r.number}
                    </Link>
                  </td>
                  <td className="p-3">
                    {r.title}
                    <span className="block text-xs text-muted">{r.order_id ? "Book order" : "Pro or service"}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{new Date(r.issued_at).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</td>
                  <td className="p-3">{(r.buyer as InvoiceParty).name || "—"}</td>
                  <td className="p-3 text-right mono">{formatPaise(r.cgst_paise + r.sgst_paise + r.igst_paise, true)}</td>
                  <td className={`p-3 text-right mono ${r.kind === "credit_note" ? "text-danger" : ""}`}>
                    {r.kind === "credit_note" ? "− " : ""}
                    {formatPaise(r.total_paise, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        The CSV has one row per document with taxable value, CGST, SGST, IGST, place of supply and HSN/SAC; credit notes are negative. Give it to your
        accountant for GST returns.
      </p>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-xl">Invoice settings</h2>
        <p className="mt-1 text-sm text-muted">
          Your business name, address and GSTIN come from Settings → Business details; GST registration is in Admin → Plans. Have your accountant confirm
          the codes and rates.
        </p>
        <InvoicingForm settings={settings} states={[...INDIAN_STATES]} />
      </section>
    </>
  );
}
