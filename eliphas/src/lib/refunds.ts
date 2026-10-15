import "server-only";
import type { OrderStatus } from "@/lib/order-status";
import { razorpayKeyId, razorpaySecret } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

/** Who may cancel at which stage. Buyers only before the printer starts; admins until it ships. */
export const CANCELLABLE: Record<"buyer" | "admin", OrderStatus[]> = {
  buyer: ["paid", "accepted"], // full refund until printing starts
  admin: ["pending_payment", "paid", "accepted", "printing", "printed", "packed"],
};

type RefundResult = { ok: true; status: "processed" | "pending" | "none" } | { ok: false; reason: string };

/** Asks Razorpay to refund a payment in full. Amount in rupees. */
async function razorpayRefund(paymentId: string, amountRupees: number, receipt: string) {
  const auth = Buffer.from(`${razorpayKeyId()}:${razorpaySecret()}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), speed: "normal", receipt: receipt.slice(0, 40) }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay refund failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as { id: string; status: "pending" | "processed" | "failed" };
}

/**
 * Refunds a cancelled order's payment, if it was paid. Safe to call again after a failure:
 * it does nothing when a refund already exists.
 */
export async function refundOrder(orderId: string): Promise<RefundResult> {
  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders")
    .select("id, order_number, status, total, payment_mode, razorpay_payment_id, refund_id, refund_status")
    .eq("id", orderId)
    .single();
  if (!o) return { ok: false, reason: "Order not found." };
  if (o.status !== "cancelled") return { ok: false, reason: "Only cancelled orders are refunded." };
  if (!o.razorpay_payment_id) return { ok: true, status: "none" }; // never paid
  if (o.refund_id && o.refund_status !== "failed") return { ok: true, status: o.refund_status === "processed" ? "processed" : "pending" };

  const amount = Number(o.total);
  try {
    const refund =
      o.payment_mode === "mock"
        ? { id: `mock_rfnd_${o.order_number}`, status: "processed" as const }
        : await razorpayRefund(o.razorpay_payment_id, amount, o.order_number);
    const status = refund.status === "processed" ? "processed" : refund.status === "failed" ? "failed" : "pending";
    await admin
      .from("orders")
      .update({
        refund_id: refund.id,
        refund_status: status,
        refund_amount: amount,
        refunded_at: status === "processed" ? new Date().toISOString() : null,
      })
      .eq("id", orderId);
    return status === "failed" ? { ok: false, reason: "Razorpay could not refund this payment." } : { ok: true, status };
  } catch (e) {
    console.error("Refund failed", orderId, e);
    await admin.from("orders").update({ refund_status: "failed", refund_amount: amount }).eq("id", orderId);
    return { ok: false, reason: "The refund didn't go through. Try again from the admin orders page, or refund in the Razorpay dashboard." };
  }
}

/**
 * Cancels an order (only from a stage the person may cancel) and refunds it.
 * The status check is part of the update, so a printer starting the job at the same moment wins safely.
 */
export async function cancelOrder(orderId: string, by: "buyer" | "admin", reason: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: by, cancel_reason: reason || null })
    .eq("id", orderId)
    .in("status", CANCELLABLE[by])
    .select("id");
  if (error) return { ok: false as const, reason: "Could not cancel the order." };
  if (!data?.length)
    return {
      ok: false as const,
      reason: by === "buyer" ? "Printing has already started, so this order can't be cancelled." : "This order can no longer be cancelled.",
    };
  const refund = await refundOrder(orderId);
  return { ok: true as const, refund };
}

/** Applies Razorpay's refund webhooks (refund.processed / refund.failed). */
export async function applyRefundEvent(refundId: string, status: "processed" | "failed") {
  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({ refund_status: status, refunded_at: status === "processed" ? new Date().toISOString() : null })
    .eq("refund_id", refundId);
}
