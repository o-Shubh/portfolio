import "server-only";
import { refundPaymentRecord } from "@/lib/billing";
import type { Database } from "@/lib/database.types";
import { logAudit } from "@/lib/plans";
import { canMove, type ServiceOrder, type ServiceStatus } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

type Patch = Database["public"]["Tables"]["service_orders"]["Update"];

/**
 * Moves a service order to a new status if that move is allowed from its current status.
 * The update is conditional on the status we read, so two people acting at once can't both win.
 * Every move is written to the order's event history.
 */
export async function moveService(
  order: Pick<ServiceOrder, "id" | "status">,
  to: ServiceStatus,
  actorId: string | null,
  note: string | null = null,
  patch: Patch = {},
): Promise<ServiceOrder | null> {
  if (!canMove(order.status, to)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("service_orders")
    .update({ ...patch, status: to })
    .eq("id", order.id)
    .eq("status", order.status)
    .select("*");
  if (!data?.length) return null;
  await admin.from("service_events").insert({ service_order_id: order.id, actor_id: actorId, from_status: order.status, to_status: to, note });
  return data[0];
}

export async function noteService(orderId: string, actorId: string | null, note: string) {
  const admin = createAdminClient();
  const { data: o } = await admin.from("service_orders").select("status").eq("id", orderId).single();
  await admin.from("service_events").insert({ service_order_id: orderId, actor_id: actorId, from_status: o?.status, to_status: o?.status, note });
}

/**
 * Cancels a service order. Before payment nothing is owed. Paid work that hasn't started is
 * refunded in full; after work starts only an admin can cancel, choosing the refund amount.
 * Pro creative requests return their credit if work hadn't started.
 */
export async function cancelService(
  order: ServiceOrder,
  by: { id: string; role: "author" | "admin" },
  reason: string,
  refundPaise?: number,
): Promise<{ ok: true; refundedPaise: number } | { error: string }> {
  const admin = createAdminClient();
  const unpaid: ServiceStatus[] = ["requirements_pending", "scope_review", "quote_awaiting_acceptance", "payment_pending"];
  if (by.role === "author" && !unpaid.includes(order.status) && order.status !== "queued") {
    return { error: "Work has already started. Please contact us to discuss cancelling." };
  }

  // Paid quotes on this order
  const { data: quotes } = await admin.from("service_quotes").select("id, payment_id, total_paise, status").eq("service_order_id", order.id).eq("status", "paid");
  const paidTotal = (quotes ?? []).reduce((a, q) => a + q.total_paise, 0);
  let toRefund = 0;
  if (paidTotal > 0) {
    if (order.status === "queued") toRefund = paidTotal; // not started: full refund
    else if (by.role === "admin") toRefund = Math.min(Math.max(0, refundPaise ?? 0), paidTotal);
    else return { error: "Work has already started. Please contact us to discuss cancelling." };
  }

  const to: ServiceStatus = toRefund > 0 ? "refunded" : "cancelled";
  const moved = await moveService(order, to, by.id, reason, { cancelled_at: new Date().toISOString(), cancel_reason: reason });
  if (!moved) return { error: "This order can't be cancelled now. Refresh the page." };

  // Refund paid quotes, newest money first, up to the amount
  let left = toRefund;
  for (const q of quotes ?? []) {
    if (left <= 0 || !q.payment_id) break;
    const amount = Math.min(left, q.total_paise);
    const r = await refundPaymentRecord(q.payment_id, amount, by.id, reason);
    if ("error" in r) return { error: `Order cancelled, but the refund failed: ${r.error}` };
    await admin.from("service_quotes").update({ status: "refunded" }).eq("id", q.id);
    left -= amount;
  }

  // A Pro credit comes back if the creative wasn't started
  if (order.kind === "pro_creative" && order.pro_period_id && ["queued"].includes(order.status)) {
    await admin.from("pro_credit_ledger").insert({
      author_id: order.author_id,
      period_id: order.pro_period_id,
      delta: 1,
      reason: "return",
      service_order_id: order.id,
      actor_id: by.id,
      note: "Request cancelled before work started",
    });
  }
  await logAudit(by.id, "service_order.cancelled", "service_order", order.id, { from: order.status, refund_paise: toRefund, reason });
  return { ok: true, refundedPaise: toRefund };
}
