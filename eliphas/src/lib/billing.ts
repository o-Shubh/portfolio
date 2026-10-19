import "server-only";
import { withGst } from "@/lib/commission";
import { checkCapture, createRazorpayOrderPaise, paymentMode, razorpayKeyId, razorpaySecret } from "@/lib/payments";
import { startPaymentRefund } from "@/lib/refunds";
import { getCurrentPlans, logAudit } from "@/lib/plans";
import { verifyPaymentSignature } from "@/lib/razorpay-signature";
import { createAdminClient } from "@/lib/supabase/admin";

/** What the browser needs to open Razorpay (or the test-payment window). */
export type PaymentStart = {
  paymentId: string;
  mode: "razorpay" | "mock";
  razorpayOrderId: string;
  keyId: string;
  amountPaise: number;
  description: string;
};

async function createPaymentRecord(input: {
  payerId: string;
  purpose: "subscription" | "service";
  description: string;
  basePaise: number;
  gstPercent: number;
  serviceQuoteId?: string;
}): Promise<{ error: string } | { start: PaymentStart; paymentId: string }> {
  let mode: "razorpay" | "mock";
  try {
    mode = paymentMode();
  } catch {
    return { error: "Payments are not set up yet. Please try again later." };
  }
  const { basePaise, gstPaise, totalPaise } = withGst(input.basePaise, input.gstPercent);
  const admin = createAdminClient();
  const { data: pay, error } = await admin
    .from("payments")
    .insert({
      payer_id: input.payerId,
      purpose: input.purpose,
      description: input.description,
      base_paise: basePaise,
      gst_percent: input.gstPercent,
      gst_paise: gstPaise,
      amount_paise: totalPaise,
      mode,
      service_quote_id: input.serviceQuoteId ?? null,
    })
    .select("id")
    .single();
  if (error || !pay) return { error: "Could not start the payment. Please try again." };

  let razorpayOrderId: string;
  if (mode === "razorpay") {
    try {
      razorpayOrderId = await createRazorpayOrderPaise({
        amountPaise: totalPaise,
        receipt: pay.id,
        notes: { payment_id: pay.id, purpose: input.purpose },
      });
    } catch (e) {
      console.error(e);
      await admin.from("payments").update({ status: "failed" }).eq("id", pay.id);
      return { error: "Couldn't reach the payment service. Please try again in a minute." };
    }
  } else {
    razorpayOrderId = `mock_order_${pay.id}`;
  }
  await admin.from("payments").update({ razorpay_order_id: razorpayOrderId }).eq("id", pay.id);
  return {
    paymentId: pay.id,
    start: {
      paymentId: pay.id,
      mode,
      razorpayOrderId,
      keyId: mode === "razorpay" ? razorpayKeyId() : "",
      amountPaise: totalPaise,
      description: input.description,
    },
  };
}

/** Starts a prepaid month of Pro. The period becomes active only after the payment is verified on the server. */
export async function startProPurchase(authorId: string) {
  const { pro } = await getCurrentPlans();
  const rec = await createPaymentRecord({
    payerId: authorId,
    purpose: "subscription",
    description: "Author Pro — 1 month (prepaid)",
    basePaise: pro.price_paise,
    gstPercent: Number(pro.gst_percent),
  });
  if ("error" in rec) return rec;
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscription_periods")
    .insert({ author_id: authorId, plan_version_id: pro.id, status: "pending", payment_id: rec.paymentId });
  if (error) return { error: "Could not start the payment. Please try again." };
  return { start: rec.start };
}

/** Starts payment of an accepted service quote. */
export async function startQuotePayment(authorId: string, quoteId: string) {
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("service_quotes")
    .select("id, status, base_paise, gst_percent, payment_id, service_orders(id, author_id, status, order_number)")
    .eq("id", quoteId)
    .single();
  const so = q?.service_orders;
  if (!q || !so || so.author_id !== authorId) return { error: "Quote not found." };
  if (q.status !== "accepted" || so.status !== "payment_pending") return { error: "This quote isn't waiting for payment." };
  // A request being replaced by a bundle upgrade is settled through the bundle quote, never paid on its own
  const { data: upgrade } = await admin
    .from("service_orders")
    .select("order_number")
    .contains("upgrade_from", [so.id])
    .not("status", "in", "(completed,cancelled,refunded)")
    .limit(1)
    .maybeSingle();
  if (upgrade) return { error: `This request is part of bundle upgrade ${upgrade.order_number}. Pay the bundle quote instead.` };
  // Reuse an unpaid payment for the same quote (e.g. the window was closed)
  if (q.payment_id) {
    const { data: existing } = await admin.from("payments").select("*").eq("id", q.payment_id).single();
    if (existing?.status === "paid") return { error: "This quote is already paid." };
    if (existing && existing.status === "created" && existing.razorpay_order_id) {
      return {
        start: {
          paymentId: existing.id,
          mode: existing.mode as "razorpay" | "mock",
          razorpayOrderId: existing.razorpay_order_id,
          keyId: existing.mode === "razorpay" ? razorpayKeyId() : "",
          amountPaise: existing.amount_paise,
          description: existing.description,
        },
      };
    }
    await admin.from("service_quotes").update({ payment_id: null }).eq("id", q.id);
    await admin.from("payments").update({ service_quote_id: null }).eq("id", q.payment_id);
  }
  const rec = await createPaymentRecord({
    payerId: authorId,
    purpose: "service",
    description: `Author service ${so.order_number}`,
    basePaise: q.base_paise,
    gstPercent: Number(q.gst_percent),
    serviceQuoteId: q.id,
  });
  if ("error" in rec) return rec;
  await admin.from("service_quotes").update({ payment_id: rec.paymentId }).eq("id", q.id);
  return { start: rec.start };
}

/** Applies a verified payment: activates Pro or queues the service work. Safe to call repeatedly. */
export async function fulfilPayment(paymentId: string, razorpayPaymentId: string, feePaise: number | null) {
  const admin = createAdminClient();
  const { data: pay } = await admin.from("payments").select("id, purpose, status").eq("id", paymentId).single();
  if (!pay) return { ok: false as const, reason: "Payment not found." };
  const fn = pay.purpose === "subscription" ? "activate_subscription" : "pay_service_quote";
  const { error } = await admin.rpc(fn, { p_payment: paymentId, p_razorpay_payment_id: razorpayPaymentId, p_fee_paise: feePaise ?? undefined });
  if (error) {
    console.error("fulfilPayment", paymentId, error);
    return { ok: false as const, reason: error.message };
  }
  return { ok: true as const };
}

/** The browser reports success: verify Razorpay's signature on the server before fulfilling. */
export async function confirmPaymentRecord(
  userId: string,
  input: { paymentId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  const admin = createAdminClient();
  const { data: pay } = await admin.from("payments").select("id, payer_id, razorpay_order_id, mode, status, amount_paise").eq("id", input.paymentId).single();
  if (!pay || pay.payer_id !== userId) return { error: "Payment not found." };
  if (pay.razorpay_order_id !== input.razorpayOrderId) return { error: "Payment doesn't match." };
  if (pay.mode === "razorpay") {
    if (!verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature, razorpaySecret())) {
      return { error: "We couldn't verify this payment. If money was taken, contact us and we'll sort it out." };
    }
  } else if (!input.razorpayPaymentId.startsWith("mock_pay_")) {
    return { error: "Invalid test payment." };
  }
  // Only captured money activates Pro or queues work; otherwise the payment.captured webhook finishes it
  let fee: number | null = null;
  if (pay.mode === "razorpay") {
    const check = await checkCapture(input.razorpayPaymentId, input.razorpayOrderId, pay.amount_paise);
    if (check.state === "invalid") return { error: check.reason };
    if (check.state === "pending") return { ok: true as const, pending: true };
    fee = check.fee;
  }
  const res = await fulfilPayment(pay.id, input.razorpayPaymentId, fee);
  return res.ok ? { ok: true as const } : { error: "Payment received, but we couldn't finish updating your account. Our team has been alerted." };
}

/**
 * Refunds part or all of a services/subscription payment through the refund ledger. The amount is reserved first, so
 * concurrent refunds can't exceed what was paid; the payment's refunded total updates when Razorpay confirms.
 */
export async function refundPaymentRecord(paymentId: string, amountPaise: number, actorId: string, reason: string) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { error: "Enter a refund amount." };
  const r = await startPaymentRefund(paymentId, amountPaise, actorId, reason);
  if (!r.ok) return { error: r.error };
  await logAudit(actorId, "payment.refunded", "payment", paymentId, { amount_paise: amountPaise, reason, refund_id: r.refundId, status: r.status });
  return { ok: true as const, refundId: r.refundId, status: r.status };
}
