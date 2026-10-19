import "server-only";
import { refundOrder } from "@/lib/refunds";
import { applyActualGatewayFee } from "@/lib/order-pricing";
import { sendOrderEmail } from "@/lib/order-emails";
import { createAdminClient } from "@/lib/supabase/admin";

export { MAX_QTY } from "@/lib/order-pricing";

/**
 * Picks the printer for a new order: an active printer in the buyer's state if
 * there is one, otherwise any active printer; the one with the fewest open jobs.
 */
async function pickPrinter(state: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("printer_load").select("printer_id, state, open_jobs").eq("active", true);
  if (!data?.length) return null;
  const sameState = data.filter((p) => p.state === state);
  const pool = sameState.length ? sameState : data;
  pool.sort((a, b) => Number(a.open_jobs) - Number(b.open_jobs));
  return pool[0].printer_id;
}

/**
 * Marks an order paid and sends it to a printer. Safe to call more than once
 * (the browser and Razorpay's webhook may both report the same payment):
 * only an order still waiting for payment is changed.
 */
export async function markOrderPaid(orderId: string, paymentId: string, mode: "razorpay" | "mock", feePaise: number | null = null) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, ship_state, razorpay_payment_id")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false as const, reason: "Order not found." };
  // Paid after it was cancelled (e.g. an admin cancelled an unpaid order): record the payment and give it back
  if (order.status === "cancelled" && !order.razorpay_payment_id) {
    await admin.from("orders").update({ razorpay_payment_id: paymentId, payment_mode: mode }).eq("id", orderId);
    await refundOrder(orderId);
    return { ok: true as const, already: true };
  }
  if (order.status !== "pending_payment") {
    // A later report may carry the actual fee (e.g. the webhook after the browser callback)
    if (feePaise !== null && order.status !== "cancelled") await applyActualGatewayFee(orderId, feePaise);
    return { ok: true as const, already: true };
  }

  const printerId = await pickPrinter(order.ship_state);
  const { data: updated, error } = await admin
    .from("orders")
    .update({
      status: "paid",
      razorpay_payment_id: paymentId,
      payment_mode: mode,
      paid_at: new Date().toISOString(),
      printer_id: printerId,
    })
    .eq("id", orderId)
    .eq("status", "pending_payment") // guard against a double update
    .select("id");
  if (error) return { ok: false as const, reason: error.message };
  if (updated?.length && feePaise !== null) await applyActualGatewayFee(orderId, feePaise);
  if (updated?.length) await sendOrderEmail(orderId, "order_confirmed");
  return { ok: true as const, already: !updated?.length };
}
