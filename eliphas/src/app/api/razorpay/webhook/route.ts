import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { applyRefundEvent } from "@/lib/refunds";
import { fulfilPayment } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay calls this when a payment is captured, so an order is confirmed even
 * if the buyer closed the app before returning. Set it up in Razorpay Dashboard →
 * Webhooks: URL https://<your-site>/api/razorpay/webhook, events "payment.captured",
 * "payment.failed", "refund.processed" and "refund.failed", and the same secret as
 * RAZORPAY_WEBHOOK_SECRET. Every handler is idempotent: Razorpay may deliver an event twice.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const raw = await request.text(); // signature covers the exact raw body
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) return new Response("Bad signature", { status: 401 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: {
      payment?: { entity?: { id: string; order_id: string; amount: number; fee?: number | null } };
      refund?: { entity?: { id: string } };
    };
  };
  if (event.event === "refund.processed" || event.event === "refund.failed") {
    const refundId = event.payload?.refund?.entity?.id;
    if (refundId) await applyRefundEvent(refundId, event.event === "refund.processed" ? "processed" : "failed");
    return Response.json({ ok: true });
  }
  const payment = event.payload?.payment?.entity;
  const admin = createAdminClient();

  if (event.event === "payment.failed") {
    if (payment?.order_id) {
      await admin.from("payments").update({ status: "failed" }).eq("razorpay_order_id", payment.order_id).eq("status", "created");
    }
    return Response.json({ ok: true });
  }
  if (event.event !== "payment.captured") return Response.json({ ignored: event.event });
  if (!payment?.order_id) return new Response("No payment", { status: 400 });
  const fee = typeof payment.fee === "number" ? payment.fee : null;

  // Book orders
  const { data: order } = await admin.from("orders").select("id, total").eq("razorpay_order_id", payment.order_id).maybeSingle();
  if (order) {
    if (Math.round(Number(order.total) * 100) !== payment.amount) {
      console.error("Webhook amount mismatch", payment.order_id);
      return new Response("Amount mismatch", { status: 400 });
    }
    const res = await markOrderPaid(order.id, payment.id, "razorpay", fee);
    return res.ok ? Response.json({ ok: true }) : new Response(res.reason, { status: 500 });
  }

  // Pro subscriptions and author services
  const { data: pay } = await admin.from("payments").select("id, amount_paise").eq("razorpay_order_id", payment.order_id).maybeSingle();
  if (!pay) return Response.json({ ignored: "unknown order" });
  if (pay.amount_paise !== payment.amount) {
    console.error("Webhook amount mismatch", payment.order_id);
    return new Response("Amount mismatch", { status: 400 });
  }
  const res = await fulfilPayment(pay.id, payment.id, fee);
  return res.ok ? Response.json({ ok: true }) : new Response(res.reason, { status: 500 });
}
