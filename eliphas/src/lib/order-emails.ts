import "server-only";
import { trackingLink } from "@/lib/couriers";
import { queueEmail } from "@/lib/email";
import { orderEmail, type OrderEmailKind } from "@/lib/email-templates";
import { rupees } from "@/lib/pricing";
import { getBusiness } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emails the buyer about an order update, once per order and kind. Goes to the email given at checkout (or the
 * profile's), only if the buyer hasn't turned order emails off. Never throws: an email problem must not affect orders.
 */
export async function sendOrderEmail(orderId: string, kind: OrderEmailKind): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: o } = await admin
      .from("orders")
      .select(
        "id, order_number, buyer_id, contact_email, ship_name, total, courier, tracking_number, tracking_url, refund_amount, cancel_reason, cancelled_by, order_items(quantity, books(title)), profiles:buyer_id(email, notify_order_emails)",
      )
      .eq("id", orderId)
      .single();
    if (!o) return;
    const buyer = o.profiles as { email: string | null; notify_order_emails: boolean } | null;
    if (buyer && !buyer.notify_order_emails) return;
    const to = o.contact_email ?? buyer?.email;
    if (!to) return;
    const business = await getBusiness();
    const email = orderEmail(kind, {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      businessName: business.legal_name || "Eliphas Indicus Publications",
      orderId: o.id,
      orderNumber: o.order_number,
      name: (o.ship_name ?? "there").split(" ")[0],
      items: (o.order_items ?? []).map((i) => ({ title: i.books?.title ?? "Book", quantity: i.quantity })),
      totalLabel: rupees(Number(o.total)),
      courier: o.courier,
      trackingNumber: o.tracking_number,
      trackingUrl: trackingLink(o.courier, o.tracking_number, o.tracking_url),
      refundLabel: o.refund_amount !== null ? rupees(Number(o.refund_amount)) : null,
      cancelReason: o.cancelled_by === "admin" ? o.cancel_reason : null,
    });
    await queueEmail({ kind, to, ...email, dedupeKey: `order:${o.id}:${kind}`, userId: o.buyer_id, orderId: o.id });
  } catch (e) {
    console.error("sendOrderEmail", orderId, kind, e);
  }
}
