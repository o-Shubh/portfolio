"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/plans";
import { checkPaymentRefund, reconcileOrderRefund, refundOrder, retryPaymentRefund } from "@/lib/refunds";

export type RefundActionState = { error?: string; ok?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const done = () => {
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
};

/** Book order: ask Razorpay what happened, then record it. */
export async function checkOrderRefundAction(orderId: string): Promise<RefundActionState> {
  await requireRole(["admin"]);
  if (!UUID.test(orderId)) return { error: "Refresh and try again." };
  const r = await reconcileOrderRefund(orderId);
  done();
  if (!r.ok) return { error: r.reason };
  return { ok: r.status === "none" ? "No refund found at Razorpay. You can retry it." : `Razorpay status: ${r.status}.` };
}

/** Book order: retry a failed refund (checks Razorpay first, so it never refunds twice). */
export async function retryOrderRefundAction(orderId: string): Promise<RefundActionState> {
  const me = await requireRole(["admin"]);
  if (!UUID.test(orderId)) return { error: "Refresh and try again." };
  const r = await refundOrder(orderId);
  await logAudit(me.id, "order.refund_retried", "order", orderId, { ok: r.ok });
  done();
  return r.ok ? { ok: r.status === "processed" ? "Refunded." : "Refund started." } : { error: r.reason };
}

/** Pro or service payment: ask Razorpay what happened to a ledger refund. */
export async function checkPaymentRefundAction(refundId: string): Promise<RefundActionState> {
  await requireRole(["admin"]);
  if (!UUID.test(refundId)) return { error: "Refresh and try again." };
  const r = await checkPaymentRefund(refundId);
  done();
  return r.ok ? { ok: `Status: ${r.status}.` } : { error: r.error };
}

/** Pro or service payment: retry a failed ledger refund. */
export async function retryPaymentRefundAction(refundId: string): Promise<RefundActionState> {
  const me = await requireRole(["admin"]);
  if (!UUID.test(refundId)) return { error: "Refresh and try again." };
  const r = await retryPaymentRefund(refundId, me.id);
  await logAudit(me.id, "payment.refund_retried", "payment_refund", refundId, { ok: r.ok });
  done();
  return r.ok ? { ok: r.status === "processed" ? "Refunded." : "Refund started." } : { error: r.error };
}
