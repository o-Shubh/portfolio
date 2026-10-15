import "server-only";
import { refundOrder } from "@/lib/refunds";
import { earnings, paymentFee, printCost, shippingFor, type PricingSettings } from "@/lib/pricing";
import type { Book } from "@/lib/publishing";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_QTY = 10;

/**
 * The money split for buying `qty` copies of a book, at today's rates.
 * Returns null if the book can't be sold right now (e.g. rates changed so the
 * author would lose money, or a print option was removed).
 */
export function priceLine(book: Book, qty: number, s: PricingSettings) {
  if (book.status !== "published" || book.mrp === null || !book.page_count) return null;
  const cost = printCost(
    {
      page_count: book.page_count,
      trim_size: book.trim_size,
      binding: book.binding,
      interior: book.interior,
      paper: book.paper,
      cover_finish: book.cover_finish,
    },
    s.rates,
  );
  if (cost === null) return null;
  const mrp = Number(book.mrp);
  const e = earnings(mrp, cost, s.fees);
  if (e.authorEarning < 0) return null;

  const subtotal = mrp * qty;
  const shipping = shippingFor(subtotal, s.shipping);
  return {
    item: {
      book_id: book.id,
      author_id: book.author_id,
      quantity: qty,
      unit_price: mrp,
      print_cost: cost,
      platform_fee: s.fees.platform_fee_per_copy,
      payment_fee: paymentFee(mrp, s.fees),
      author_earning: e.authorEarning,
    },
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}

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
export async function markOrderPaid(orderId: string, paymentId: string, mode: "razorpay" | "mock") {
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
  if (order.status !== "pending_payment") return { ok: true as const, already: true };

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
  return { ok: true as const, already: !updated?.length };
}
