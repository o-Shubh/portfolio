import "server-only";
import type { OrderStatus } from "@/lib/order-status";
import { fetchRefund, listRefunds, refundPayment, type RazorpayRefund } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

/** Who may cancel at which stage. Buyers only before the printer starts; admins until it ships. */
export const CANCELLABLE: Record<"buyer" | "admin", OrderStatus[]> = {
  buyer: ["paid", "accepted"], // full refund until printing starts
  admin: ["pending_payment", "paid", "accepted", "printing", "printed", "packed"],
};

type RefundResult = { ok: true; status: "processed" | "pending" | "none" } | { ok: false; reason: string };
const asStatus = (s: RazorpayRefund["status"]) => (s === "processed" ? "processed" : s === "failed" ? "failed" : "pending");

// ---------------------------------------------------------------------------
// Book orders
// ---------------------------------------------------------------------------

/**
 * Refunds a cancelled order's payment in full. The refund is claimed in the database first ("requested"),
 * so two clicks or a click and a retry can't refund twice. Safe to call again after a failure.
 */
export async function refundOrder(orderId: string): Promise<RefundResult> {
  const admin = createAdminClient();
  const { data: o, error: readError } = await admin
    .from("orders")
    .select("id, order_number, status, total, payment_mode, razorpay_payment_id, refund_id, refund_status")
    .eq("id", orderId)
    .single();
  if (readError || !o) return { ok: false, reason: "Order not found." };
  if (o.status !== "cancelled") return { ok: false, reason: "Only cancelled orders are refunded." };
  if (!o.razorpay_payment_id) return { ok: true, status: "none" }; // never paid
  if (o.refund_status === "processed" || o.refund_status === "pending") return { ok: true, status: o.refund_status };
  if (o.refund_status === "requested") return { ok: false, reason: "A refund for this order is already in progress. Use Check status on the Refunds page." };

  // A failed attempt may still have reached Razorpay (for example a timeout): look before trying again
  if (o.refund_status === "failed" && o.payment_mode === "razorpay") {
    const found = await reconcileOrderRefund(orderId);
    if (found.ok && found.status !== "none") return found;
  }

  const amount = Number(o.total);
  const { data: claimed, error: claimError } = await admin
    .from("orders")
    .update({ refund_status: "requested", refund_id: null, refund_amount: amount })
    .eq("id", orderId)
    .eq("status", "cancelled")
    .or("refund_status.is.null,refund_status.eq.failed")
    .select("id");
  if (claimError) return { ok: false, reason: "Could not start the refund. Try again." };
  if (!claimed?.length) return { ok: false, reason: "A refund for this order is already in progress." };

  try {
    const refund =
      o.payment_mode === "mock"
        ? { id: `mock_rfnd_${o.order_number}_${Date.now()}`, status: "processed" as const }
        : await refundPayment(o.razorpay_payment_id, Math.round(amount * 100), o.order_number);
    const status = asStatus(refund.status);
    await admin
      .from("orders")
      .update({ refund_id: refund.id, refund_status: status, refunded_at: status === "processed" ? new Date().toISOString() : null })
      .eq("id", orderId);
    return status === "failed" ? { ok: false, reason: "Razorpay could not refund this payment." } : { ok: true, status };
  } catch (e) {
    console.error("Refund failed", orderId, e);
    await admin.from("orders").update({ refund_status: "failed" }).eq("id", orderId).eq("refund_status", "requested");
    return { ok: false, reason: "The refund didn't go through. Try again from Admin → Refunds, or refund in the Razorpay dashboard." };
  }
}

/** Asks Razorpay what happened to an order's refund and records it. Used by "Check status" and before a retry. */
export async function reconcileOrderRefund(orderId: string): Promise<RefundResult> {
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("id, payment_mode, razorpay_payment_id, refund_id, refund_status, total").eq("id", orderId).single();
  if (!o?.razorpay_payment_id || o.payment_mode !== "razorpay") return { ok: true, status: "none" };
  let refund: RazorpayRefund | null = null;
  if (o.refund_id) refund = await fetchRefund(o.refund_id);
  else {
    const all = await listRefunds(o.razorpay_payment_id);
    if (all === null) return { ok: false, reason: "Razorpay couldn't be reached. Try again in a minute." };
    refund = all.find((r) => r.status !== "failed") ?? null;
  }
  if (!refund) {
    // Nothing reached Razorpay: an interrupted claim can be retried
    if (o.refund_status === "requested") await admin.from("orders").update({ refund_status: "failed" }).eq("id", orderId).eq("refund_status", "requested");
    return { ok: true, status: "none" };
  }
  const status = asStatus(refund.status);
  await admin
    .from("orders")
    .update({
      refund_id: refund.id,
      refund_status: status,
      refund_amount: Number(o.total),
      refunded_at: status === "processed" ? new Date().toISOString() : null,
    })
    .eq("id", orderId);
  return status === "failed" ? { ok: false, reason: "Razorpay reports this refund failed. You can retry it." } : { ok: true, status };
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

// ---------------------------------------------------------------------------
// Pro and service payments (payment_refunds ledger, migration 000021)
// ---------------------------------------------------------------------------

type LedgerResult = { ok: true; refundId: string; status: "pending" | "processed" } | { ok: false; error: string };

/** Sends one ledger row to Razorpay (or records a test refund) and stores the answer. */
async function sendLedgerRefund(rowId: string): Promise<LedgerResult> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("payment_refunds").select("id, amount_paise, payments(mode, razorpay_payment_id)").eq("id", rowId).single();
  const pay = row?.payments;
  if (!row || !pay) return { ok: false, error: "Refund not found." };
  try {
    let refund: { id: string; status: RazorpayRefund["status"] };
    if (pay.mode === "mock") refund = { id: `mock_rfnd_${row.id}`, status: "processed" };
    else if (!pay.razorpay_payment_id) throw new Error("No Razorpay payment to refund.");
    else refund = await refundPayment(pay.razorpay_payment_id, row.amount_paise, row.id); // receipt = ledger id, to find it again
    const status = asStatus(refund.status);
    const { error } = await admin.rpc("settle_payment_refund", { p_refund: row.id, p_status: status, p_razorpay_id: refund.id });
    if (error) {
      console.error("settle_payment_refund", row.id, error);
      return { ok: false, error: "Razorpay accepted the refund but we couldn't record it. Use Check status on Admin → Refunds." };
    }
    return status === "failed" ? { ok: false, error: "Razorpay could not refund this payment." } : { ok: true, refundId: refund.id, status };
  } catch (e) {
    console.error("Payment refund failed", row.id, e);
    await admin.rpc("settle_payment_refund", { p_refund: row.id, p_status: "failed", p_error: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: "Razorpay refused the refund. It's listed on Admin → Refunds to retry." };
  }
}

/** Reserves and sends a refund for part or all of a payment. The database refuses more than was paid. */
export async function startPaymentRefund(paymentId: string, amountPaise: number, actorId: string, reason: string): Promise<LedgerResult> {
  const admin = createAdminClient();
  const { data: rowId, error } = await admin.rpc("begin_payment_refund", { p_payment: paymentId, p_amount: amountPaise, p_reason: reason, p_actor: actorId });
  if (error || !rowId) {
    const msg = error?.message ?? "";
    return {
      ok: false,
      error: msg.includes("exceeds")
        ? "That's more than is left to refund on this payment."
        : msg.includes("Only paid")
          ? "Only paid payments can be refunded."
          : "Could not start the refund.",
    };
  }
  return sendLedgerRefund(rowId);
}

/** Finds a ledger refund at Razorpay (by its id, or by receipt if we never got a reply) and records its status. */
export async function checkPaymentRefund(rowId: string): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("payment_refunds")
    .select("id, status, razorpay_refund_id, created_at, payments(mode, razorpay_payment_id)")
    .eq("id", rowId)
    .single();
  if (!row?.payments) return { ok: false, error: "Refund not found." };
  if (row.status === "processed" || row.payments.mode !== "razorpay") return { ok: true, status: row.status };
  let refund: RazorpayRefund | null = null;
  if (row.razorpay_refund_id) refund = await fetchRefund(row.razorpay_refund_id);
  else if (row.payments.razorpay_payment_id) {
    const all = await listRefunds(row.payments.razorpay_payment_id);
    if (all === null) return { ok: false, error: "Razorpay couldn't be reached. Try again in a minute." };
    refund = all.find((r) => r.receipt === row.id) ?? null;
  }
  if (!refund) {
    // Never reached Razorpay: mark an old "requested" as failed so it can be retried
    if (row.status === "requested" && Date.now() - new Date(row.created_at).getTime() > 10 * 60_000) {
      await admin.rpc("settle_payment_refund", { p_refund: row.id, p_status: "failed", p_error: "No refund found at Razorpay." });
      return { ok: true, status: "failed" };
    }
    return { ok: true, status: row.status };
  }
  const status = asStatus(refund.status);
  const { error } = await admin.rpc("settle_payment_refund", { p_refund: row.id, p_status: status, p_razorpay_id: refund.id });
  return error ? { ok: false, error: "Could not record the refund status." } : { ok: true, status };
}

/** Retries a failed ledger refund, after checking Razorpay didn't actually make it. */
export async function retryPaymentRefund(rowId: string, actorId: string): Promise<LedgerResult> {
  const admin = createAdminClient();
  const checked = await checkPaymentRefund(rowId);
  if (!checked.ok) return { ok: false, error: checked.error };
  const { data: row } = await admin.from("payment_refunds").select("id, payment_id, amount_paise, status, reason, razorpay_refund_id").eq("id", rowId).single();
  if (!row) return { ok: false, error: "Refund not found." };
  if (row.status === "processed" || row.status === "pending") return { ok: true, refundId: row.razorpay_refund_id ?? row.id, status: row.status };
  if (row.status !== "failed") return { ok: false, error: "This refund is still waiting for Razorpay. Use Check status." };
  const { error } = await admin.rpc("begin_payment_refund", {
    p_payment: row.payment_id,
    p_amount: row.amount_paise,
    p_reason: row.reason,
    p_actor: actorId,
    p_retry: row.id,
  });
  if (error)
    return { ok: false, error: error.message.includes("exceeds") ? "That's more than is left to refund on this payment." : "Could not retry the refund." };
  return sendLedgerRefund(row.id);
}

// ---------------------------------------------------------------------------
// Razorpay webhooks
// ---------------------------------------------------------------------------

/** Applies refund.processed / refund.failed to book orders and the payment ledger. Reports database errors. */
export async function applyRefundEvent(refundId: string, status: "processed" | "failed"): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  const { error: orderError } = await admin
    .from("orders")
    .update({ refund_status: status, refunded_at: status === "processed" ? new Date().toISOString() : null })
    .eq("refund_id", refundId)
    .neq("refund_status", "processed");
  if (orderError) return { ok: false };
  const { data: row, error: readError } = await admin.from("payment_refunds").select("id").eq("razorpay_refund_id", refundId).maybeSingle();
  if (readError) return { ok: false };
  if (row) {
    const { error } = await admin.rpc("settle_payment_refund", { p_refund: row.id, p_status: status, p_razorpay_id: refundId });
    if (error) return { ok: false };
  }
  return { ok: true };
}
