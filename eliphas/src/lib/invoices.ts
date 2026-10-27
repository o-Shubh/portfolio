import "server-only";
import { getCurrentPlans, getTaxSettings } from "@/lib/plans";
import { getBusiness } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InvoicingSettings = {
  live_payments: boolean;
  seller_state: string;
  book_hsn: string;
  book_gst_percent: number;
  shipping_gst_percent: number;
  service_sac: string;
  subscription_sac: string;
  footer_note: string;
};

const DEFAULTS: InvoicingSettings = {
  live_payments: false,
  seller_state: "",
  book_hsn: "4901",
  book_gst_percent: 0,
  shipping_gst_percent: 0,
  service_sac: "",
  subscription_sac: "",
  footer_note: "",
};

export async function getInvoicingSettings(): Promise<InvoicingSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "invoicing").maybeSingle();
  return { ...DEFAULTS, ...((data?.value as Partial<InvoicingSettings>) ?? {}) };
}

/**
 * Paid orders and payments without an invoice, and refunds without a credit note. Normally empty: the database
 * issues them as payments and refunds happen, and logs anything that went wrong in invoice_failures.
 */
export async function missingInvoices() {
  const admin = createAdminClient();
  const [{ data: orders }, { data: payments }, { data: refundedOrders }, { data: refunds }] = await Promise.all([
    admin
      .from("orders")
      .select("id, order_number, total, credit_used, paid_at, invoices(id)")
      .not("paid_at", "is", null)
      .is("replacement_of", null)
      .order("paid_at", { ascending: false })
      .limit(1000),
    admin.from("payments").select("id, description, paid_at, invoices(id)").not("paid_at", "is", null).order("paid_at", { ascending: false }).limit(1000),
    admin
      .from("orders")
      .select("id, order_number, status, total, refund_status, invoices(id, kind)")
      .or("refund_status.eq.processed,and(status.eq.cancelled,total.eq.0)")
      .not("paid_at", "is", null)
      .limit(1000),
    admin.from("payment_refunds").select("id, payment_id, invoices(id)").eq("status", "processed").limit(1000),
  ]);
  return {
    orders: (orders ?? []).filter((o) => Number(o.total) + Number(o.credit_used) > 0 && o.invoices.length === 0),
    payments: (payments ?? []).filter((p) => p.invoices.length === 0),
    orderCredits: (refundedOrders ?? []).filter((o) => o.invoices.some((i) => i.kind === "invoice") && !o.invoices.some((i) => i.kind === "credit_note")),
    paymentCredits: (refunds ?? []).filter((r) => !r.invoices), // one credit note per refund
  };
}

/** Setup problems that make invoices wrong or incomplete, in plain words for the admin. */
export async function invoiceWarnings(): Promise<string[]> {
  const supabase = await createClient();
  const [business, tax, inv, plans, { data: services }] = await Promise.all([
    getBusiness(),
    getTaxSettings(),
    getInvoicingSettings(),
    getCurrentPlans(),
    supabase.from("service_catalog").select("name, gst_percent").eq("active", true),
  ]);
  const out: string[] = [];
  const liveKeys = (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_");
  if (liveKeys && !inv.live_payments) out.push("Razorpay live keys are in use but “Payments are live” is off below, so new invoices are test documents (TST). Turn it on.");
  if (!liveKeys && inv.live_payments) out.push("“Payments are live” is on but the Razorpay keys aren't live keys. Test payments would get real invoice numbers: turn it off until you switch to live keys.");
  if (!business.legal_name || !business.address) out.push("Add your legal business name and registered address in Settings → Business details. Both are printed on every invoice.");
  if (tax.gst_registered && !business.gstin) out.push("GST registration is on (Admin → Plans) but there's no GSTIN in Settings → Business details, so invoices aren't tax invoices yet.");
  if (!tax.gst_registered && business.gstin) out.push("A GSTIN is set but GST registration is off (Admin → Plans), so invoices are titled “Invoice”, not “Tax invoice”.");
  const taxedServices = (services ?? []).filter((s) => Number(s.gst_percent) > 0);
  if (!(tax.gst_registered && business.gstin) && (Number(plans.pro.gst_percent) > 0 || taxedServices.length > 0)) {
    out.push(
      "GST is added to Author Pro or services, but the business isn't set up as GST-registered. Only a registered business may charge GST: set those GST rates to 0% (Admin → Plans and Services) or turn on registration with your GSTIN.",
    );
  }
  if (!business.gstin && !inv.seller_state) out.push("Choose your state below, so invoices show where the supply is from and split GST correctly.");
  if (tax.gst_registered && business.gstin && (!inv.service_sac || !inv.subscription_sac)) out.push("Add the SAC codes for services and Author Pro below. Tax invoices need them.");
  return out;
}
