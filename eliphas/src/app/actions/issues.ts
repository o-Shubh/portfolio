"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { refundPayment } from "@/lib/payments";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type IssueState = { error?: string; ok?: string } | undefined;

const KINDS = ["damaged", "misprint", "wrong_item", "not_delivered"] as const;
const REPORT_DAYS = 7;

/** A reader reports a damaged, misprinted, wrong or missing book on their own order. */
export async function reportIssue(orderId: string, _prev: IssueState, fd: FormData): Promise<IssueState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };
  const kind = String(fd.get("kind") ?? "") as (typeof KINDS)[number];
  const description = String(fd.get("description") ?? "").trim().slice(0, 2000);
  const photos = String(fd.get("photos") ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (!KINDS.includes(kind)) return { error: "Choose what went wrong." };
  if (description.length < 10) return { error: "Tell us a little more about the problem." };
  if (photos.some((p) => !p.startsWith(`${profile.id}/`))) return { error: "Invalid photo." };

  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, status, delivered_at, shipped_at").eq("id", orderId).eq("buyer_id", profile.id).maybeSingle();
  if (!order) return { error: "Order not found." };
  if (kind === "not_delivered") {
    if (order.status !== "shipped") return { error: "You can report a missing parcel once the order has shipped." };
  } else {
    if (order.status !== "delivered" || !order.delivered_at) return { error: "You can report this once the order is delivered." };
    if (Date.now() - new Date(order.delivered_at).getTime() > REPORT_DAYS * 86_400_000) {
      return { error: `Problems must be reported within ${REPORT_DAYS} days of delivery. Please contact us.` };
    }
  }
  const admin = createAdminClient();
  const { error } = await admin.from("order_issues").insert({ order_id: order.id, buyer_id: profile.id, kind, description, photo_paths: photos });
  if (error) return { error: error.code === "23505" ? "You've already reported a problem with this order. We'll be in touch." : "Could not send. Please try again." };
  revalidatePath(`/account/orders/${order.id}`);
  revalidatePath("/admin/issues");
  return { ok: "Thanks. We'll review this and arrange a replacement or refund." };
}

/**
 * Admin resolves an issue:
 * - replacement: a free copy is printed and shipped (new zero-value order; no extra author earning or commission)
 * - refund: the payment is refunded and the order's author earnings are reversed
 * - rejected: with a note to the reader
 */
export async function resolveIssue(issueId: string, _prev: IssueState, fd: FormData): Promise<IssueState> {
  const profile = await requireRole(["admin"]);
  const action = String(fd.get("action") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 2000);
  if (note.length < 5) return { error: "Add a note for the reader." };
  const admin = createAdminClient();
  const { data: issue } = await admin.from("order_issues").select("*").eq("id", issueId).single();
  if (!issue || issue.status !== "open") return { error: "This issue is already resolved." };
  const { data: order } = await admin.from("orders").select("*, order_items(*)").eq("id", issue.order_id).single();
  if (!order) return { error: "Order not found." };
  const resolved = { resolution_note: note, resolved_by: profile.id, resolved_at: new Date().toISOString() };

  if (action === "replacement") {
    const { data: copy, error } = await admin
      .from("orders")
      .insert({
        buyer_id: order.buyer_id,
        status: "paid",
        subtotal: 0,
        shipping: 0,
        total: 0,
        payment_mode: "none",
        paid_at: new Date().toISOString(),
        printer_id: order.printer_id,
        replacement_of: order.id,
        ship_name: order.ship_name,
        ship_phone: order.ship_phone,
        ship_line1: order.ship_line1,
        ship_line2: order.ship_line2,
        ship_city: order.ship_city,
        ship_state: order.ship_state,
        ship_pincode: order.ship_pincode,
      })
      .select("id")
      .single();
    if (error || !copy) return { error: "Could not create the replacement order." };
    await admin.from("order_items").insert(
      order.order_items.map((i) => ({
        order_id: copy.id,
        book_id: i.book_id,
        author_id: i.author_id,
        quantity: i.quantity,
        unit_price: 0,
        print_cost: i.print_cost,
        platform_fee: 0,
        payment_fee: 0,
        author_earning: 0,
        print_cost_total: i.print_cost_total ?? Number(i.print_cost) * i.quantity,
        commission: 0,
        commission_gst: 0,
        gateway_allocated: 0,
        author_earning_total: 0,
        sale_channel: "replacement",
        file_snapshot: i.file_snapshot,
        commission_rule: { replacement_of_item: i.id },
      })),
    );
    await admin.from("order_issues").update({ ...resolved, status: "replacement", replacement_order_id: copy.id }).eq("id", issue.id);
    await logAudit(profile.id, "order_issue.replacement", "order", order.id, { issue: issue.id, replacement: copy.id });
  } else if (action === "refund") {
    const amount = Math.round(Number(order.total) * 100);
    if (amount > 0) {
      if (order.payment_mode === "razorpay") {
        if (!order.razorpay_payment_id) return { error: "No payment to refund." };
        try {
          const r = await refundPayment(order.razorpay_payment_id, amount, order.order_number);
          await admin.from("orders").update({ refund_id: r.id, refund_status: r.status === "processed" ? "processed" : "pending", refund_amount: amount / 100 }).eq("id", order.id);
        } catch (e) {
          console.error(e);
          return { error: "Razorpay refused the refund. Try again or refund from the Razorpay dashboard." };
        }
      } else {
        await admin.from("orders").update({ refund_id: `mock_rfnd_${order.order_number}`, refund_status: "processed", refund_amount: amount / 100, refunded_at: new Date().toISOString() }).eq("id", order.id);
      }
    }
    // Earnings on a refunded order are reversed (shown to the author)
    await admin.from("order_items").update({ reversed_at: new Date().toISOString(), reversal_reason: `Refunded: ${issue.kind}` }).eq("order_id", order.id);
    await admin.from("order_issues").update({ ...resolved, status: "refund", refund_paise: amount }).eq("id", issue.id);
    await logAudit(profile.id, "order_issue.refund", "order", order.id, { issue: issue.id, amount_paise: amount });
  } else if (action === "rejected") {
    await admin.from("order_issues").update({ ...resolved, status: "rejected" }).eq("id", issue.id);
    await logAudit(profile.id, "order_issue.rejected", "order", order.id, { issue: issue.id });
  } else {
    return { error: "Choose how to resolve it." };
  }
  revalidatePath("/admin/issues");
  revalidatePath(`/account/orders/${order.id}`);
  return { ok: "Resolved." };
}
