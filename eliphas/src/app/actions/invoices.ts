"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { INDIAN_STATES } from "@/lib/india";
import { missingInvoices } from "@/lib/invoices";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type InvoiceActionState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Seller state, HSN/SAC codes, GST on books and shipping, and the note printed on invoices. Applies to new invoices. */
export async function saveInvoicing(_prev: InvoiceActionState, fd: FormData): Promise<InvoiceActionState> {
  const me = await requireRole(["admin"]);
  const state = text(fd, "seller_state");
  if (state && !(INDIAN_STATES as readonly string[]).includes(state)) return { error: "Choose the state from the list." };
  const codes = { book_hsn: text(fd, "book_hsn"), service_sac: text(fd, "service_sac"), subscription_sac: text(fd, "subscription_sac") };
  for (const [k, v] of Object.entries(codes)) {
    if (v && !/^\d{4,8}$/.test(v)) return { error: `${k === "book_hsn" ? "HSN" : "SAC"} codes are 4 to 8 digits.` };
  }
  const rates = { book_gst_percent: Number(text(fd, "book_gst_percent") || 0), shipping_gst_percent: Number(text(fd, "shipping_gst_percent") || 0) };
  for (const v of Object.values(rates)) if (!Number.isFinite(v) || v < 0 || v > 28) return { error: "GST rates are between 0 and 28%." };
  const footer = text(fd, "footer_note");
  if (footer.length > 500) return { error: "Keep the note under 500 characters." };

  const value = { live_payments: fd.get("live_payments") === "on", seller_state: state, ...codes, ...rates, footer_note: footer };
  const { error } = await createAdminClient()
    .from("settings")
    .update({ value: value as unknown as NonNullable<Json>, updated_by: me.id })
    .eq("key", "invoicing");
  if (error) return { error: "Could not save." };
  await logAudit(me.id, "settings.invoicing", "settings", null, value);
  revalidatePath("/admin/invoices");
  return { ok: "Saved. New invoices use these settings; issued invoices never change." };
}

/** Issues every invoice and credit note that's missing (e.g. after a problem was logged). Safe to run any time. */
export async function issueMissingInvoices(): Promise<InvoiceActionState> {
  const me = await requireRole(["admin"]);
  const admin = createAdminClient();
  const missing = await missingInvoices();
  let issued = 0;
  const problems: string[] = [];
  const run = async (label: string, call: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const { data, error } = await call;
    if (error) problems.push(`${label}: ${error.message}`);
    else if (data) issued++;
  };
  for (const o of missing.orders) await run(`Order ${o.order_number}`, admin.rpc("issue_order_invoice", { p_order: o.id }));
  for (const p of missing.payments) await run(`Payment ${p.description}`, admin.rpc("issue_payment_invoice", { p_payment: p.id }));
  for (const o of missing.orderCredits) await run(`Refund of ${o.order_number}`, admin.rpc("issue_order_credit_note", { p_order: o.id }));
  for (const r of missing.paymentCredits) await run("Payment refund", admin.rpc("issue_payment_credit_note", { p_refund: r.id }));
  // Logged problems that are now resolved are cleared
  if (!problems.length) await admin.from("invoice_failures").delete().not("id", "is", null);
  await logAudit(me.id, "invoices.issue_missing", "invoice", null, { issued, problems: problems.length });
  revalidatePath("/admin/invoices");
  if (problems.length) return { error: `Issued ${issued}. Still failing: ${problems.slice(0, 3).join("; ")}` };
  return { ok: issued ? `Issued ${issued} missing ${issued === 1 ? "document" : "documents"}.` : "Nothing was missing." };
}
