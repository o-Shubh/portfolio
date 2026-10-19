"use server";

import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { CAMPAIGN_COOKIE } from "@/lib/campaigns";
import { readCart, writeCart } from "@/lib/cart";
import { parseCheckoutItems, type CheckoutItem } from "@/lib/cart-codec";
import { toRupees } from "@/lib/commission";
import { INDIAN_STATES } from "@/lib/india";
import type { Book } from "@/lib/publishing";
import { markOrderPaid } from "@/lib/orders";
import { orderItemRows, priceOrder } from "@/lib/order-pricing";
import { checkCapture, createRazorpayOrder, paymentMode, razorpayKeyId, razorpaySecret } from "@/lib/payments";
import { cleanIndianMobile } from "@/lib/phone";
import { verifyPaymentSignature } from "@/lib/razorpay-signature";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CheckoutResult =
  | { error: string }
  | {
      orderId: string;
      orderNumber: string;
      mode: "razorpay" | "mock";
      razorpayOrderId: string;
      keyId: string;
      amountPaise: number;
      name: string;
      phone: string;
      fromCart: boolean;
    };

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export type ShippingQuoteResult =
  | { error: string }
  | { shippingPaise: number; basePaise: number; discountPaise: number; promotion: string | null; booksPaise: number; totalPaise: number; isSample: boolean };

/** The published books for the order, in the order given. Every book must still be on sale. */
async function orderLines(items: CheckoutItem[]): Promise<{ lines: { book: Book; quantity: number }[] } | { error: string }> {
  // Server read: the order needs the approved file pins, which aren't public
  const { data: books } = await createAdminClient()
    .from("books")
    .select("*")
    .in(
      "slug",
      items.map((i) => i.slug),
    )
    .eq("status", "published");
  const lines: { book: Book; quantity: number }[] = [];
  for (const i of items) {
    const book = books?.find((b) => b.slug === i.slug);
    if (!book) return { error: items.length > 1 ? "A book in your cart is no longer available. Please check your cart." : "This book is no longer available." };
    lines.push({ book, quantity: i.qty });
  }
  return { lines };
}

/** Live quote shown before payment: shipping for this PIN code (one parcel for all books) and the total to pay. */
export async function quoteCheckout(input: CheckoutItem[], pincode: string): Promise<ShippingQuoteResult> {
  if (!/^[1-9]\d{5}$/.test(pincode)) return { error: "Enter a 6-digit PIN code to see shipping." };
  const items = parseCheckoutItems(input);
  if ("error" in items) return items;
  const found = await orderLines(items);
  if ("error" in found) return { error: found.error };
  const priced = await priceOrder(found.lines, pincode, await getPricingSettings());
  if ("error" in priced) return { error: priced.error };
  return {
    shippingPaise: priced.split.shippingPaise,
    basePaise: priced.shipping.basePaise,
    discountPaise: priced.shipping.discountPaise,
    promotion: priced.shipping.promotionName,
    booksPaise: priced.split.booksPaise,
    totalPaise: priced.split.totalPaise,
    isSample: priced.shipping.isSample,
  };
}

/** Step 1: check the address, price the order on the server, create it, and start the payment. */
export async function startCheckout(fd: FormData): Promise<CheckoutResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };

  const items = parseCheckoutItems(text(fd, "items"));
  const fromCart = fd.get("from_cart") === "1";
  const name = text(fd, "ship_name");
  const mobile = cleanIndianMobile(text(fd, "ship_phone"));
  const line1 = text(fd, "ship_line1");
  const line2 = text(fd, "ship_line2");
  const city = text(fd, "ship_city");
  const state = text(fd, "ship_state");
  const pincode = text(fd, "ship_pincode");

  if ("error" in items) return items;
  const expectedTotal = Number(fd.get("expected_total_paise"));
  if (name.length < 2) return { error: "Enter the name for delivery." };
  if (!mobile) return { error: "Enter a valid 10-digit mobile number for the courier." };
  if (line1.length < 5) return { error: "Enter the house / street address." };
  if (!city) return { error: "Enter the city." };
  if (!(INDIAN_STATES as readonly string[]).includes(state)) return { error: "Choose the state." };
  if (!/^[1-9]\d{5}$/.test(pincode)) return { error: "PIN code should be 6 digits." };

  // Price from the database, never from the browser
  const supabase = await createClient();
  const found = await orderLines(items);
  if ("error" in found) return { error: found.error };
  const settings = await getPricingSettings();
  const priced = await priceOrder(found.lines, pincode, settings);
  if ("error" in priced) return { error: priced.error };
  // The reader must see the same total they are asked to pay
  if (Number.isFinite(expectedTotal) && expectedTotal > 0 && expectedTotal !== priced.split.totalPaise) {
    return { error: "The price or shipping changed. Please check the new total and pay again." };
  }

  // Campaign attribution: a link for one of these books clicked in the last 30 days
  let campaignLinkId: string | null = null;
  const code = (await cookies()).get(CAMPAIGN_COOKIE)?.value;
  if (code && /^[a-z0-9]{6,12}$/.test(code)) {
    const { data: link } = await createAdminClient().from("campaign_links").select("id, book_id").eq("code", code).maybeSingle();
    if (link && found.lines.some((l) => l.book.id === link.book_id)) campaignLinkId = link.id;
  }

  let mode: "razorpay" | "mock";
  try {
    mode = paymentMode();
  } catch {
    return { error: "Payments are not set up yet. Please try again later." };
  }

  // Orders are created with full access: readers have no direct write access to orders.
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      buyer_id: profile.id,
      subtotal: toRupees(priced.split.booksPaise),
      shipping: toRupees(priced.split.shippingPaise),
      total: toRupees(priced.split.totalPaise),
      shipping_quote: priced.shipping,
      shipping_discount: toRupees(priced.shipping.discountPaise),
      shipping_promotion_id: priced.shipping.promotionId,
      gateway_fee: toRupees(priced.split.gatewayTotalPaise),
      gateway_fee_source: "estimated",
      campaign_link_id: campaignLinkId,
      ship_name: name,
      ship_phone: `91${mobile}`,
      ship_line1: line1,
      ship_line2: line2 || null,
      ship_city: city,
      ship_state: state,
      ship_pincode: pincode,
    })
    .select("id, order_number")
    .single();
  if (error || !order) return { error: "Could not create the order. Please try again." };

  const { error: itemError } = await admin.from("order_items").insert(orderItemRows(order.id, priced));
  if (itemError) {
    await admin.from("orders").delete().eq("id", order.id);
    return { error: "Could not create the order. Please try again." };
  }

  // Remember the address for next time
  if (!profile.pincode || !profile.city) {
    await supabase
      .from("profiles")
      .update({ city: profile.city ?? city, pincode: profile.pincode ?? pincode })
      .eq("id", profile.id);
  }

  let razorpayOrderId: string;
  if (mode === "razorpay") {
    try {
      razorpayOrderId = await createRazorpayOrder({
        amountRupees: toRupees(priced.split.totalPaise),
        receipt: order.order_number,
        notes: { order_id: order.id, order_number: order.order_number },
      });
    } catch (e) {
      console.error(e);
      await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      return { error: "Couldn't reach the payment service. Please try again in a minute." };
    }
  } else {
    razorpayOrderId = `mock_order_${order.id.slice(0, 8)}`;
  }
  await admin.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", order.id);

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    mode,
    razorpayOrderId,
    keyId: mode === "razorpay" ? razorpayKeyId() : "",
    amountPaise: priced.split.totalPaise,
    name,
    phone: mobile,
    fromCart,
  };
}

/** Step 2: the browser reports a successful payment. We check Razorpay's signature before trusting it. */
export async function confirmPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  fromCart?: boolean;
}): Promise<{ ok: true; pending?: boolean } | { error: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, buyer_id, razorpay_order_id, status, total").eq("id", input.orderId).single();
  if (!order || order.buyer_id !== profile.id) return { error: "Order not found." };
  if (order.razorpay_order_id !== input.razorpayOrderId) return { error: "Payment doesn't match this order." };

  const mode = paymentMode();
  if (mode === "razorpay") {
    if (!verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature, razorpaySecret())) {
      return { error: "We couldn't verify this payment. If money was taken, it will be refunded automatically." };
    }
  } else if (!input.razorpayPaymentId.startsWith("mock_pay_")) {
    return { error: "Invalid test payment." };
  }

  // Only captured money sends a book to print. Until then the order waits and the payment.captured webhook finishes it.
  let fee: number | null = null;
  if (mode === "razorpay") {
    const check = await checkCapture(input.razorpayPaymentId, input.razorpayOrderId, Math.round(Number(order.total) * 100));
    if (check.state === "invalid") return { error: check.reason };
    if (check.state === "pending") return { ok: true, pending: true };
    fee = check.fee; // the actual Razorpay fee replaces the estimate in the money split
  }
  const res = await markOrderPaid(order.id, input.razorpayPaymentId, mode, fee);
  if (!res.ok) return { error: "Payment received, but we couldn't update your order. Our team will fix it." };
  // Take the books just bought out of the cart (anything else stays for later)
  if (input.fromCart) {
    const { data: bought } = await admin.from("order_items").select("book_id").eq("order_id", order.id);
    const ids = new Set((bought ?? []).map((b) => b.book_id));
    await writeCart((await readCart()).filter((l) => !ids.has(l.bookId)));
  }
  return { ok: true };
}
