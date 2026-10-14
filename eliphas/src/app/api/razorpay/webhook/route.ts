import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay calls this when a payment is captured, so an order is confirmed even
 * if the buyer closed the app before returning. Set it up in Razorpay Dashboard →
 * Webhooks: URL https://<your-site>/api/razorpay/webhook, event "payment.captured",
 * and the same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const raw = await request.text(); // signature covers the exact raw body
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) return new Response("Bad signature", { status: 401 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; amount: number } } };
  };
  if (event.event !== "payment.captured") return Response.json({ ignored: event.event });

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return new Response("No payment", { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, total")
    .eq("razorpay_order_id", payment.order_id)
    .maybeSingle();
  if (!order) return Response.json({ ignored: "unknown order" });
  if (Math.round(Number(order.total) * 100) !== payment.amount) {
    console.error("Webhook amount mismatch", payment.order_id);
    return new Response("Amount mismatch", { status: 400 });
  }

  const res = await markOrderPaid(order.id, payment.id, "razorpay");
  return res.ok ? Response.json({ ok: true }) : new Response(res.reason, { status: 500 });
}
