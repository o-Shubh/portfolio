"use server";

import { getCurrentProfile } from "@/lib/auth";
import { INDIAN_STATES } from "@/lib/india";
import { MAX_QTY, markOrderPaid, priceLine } from "@/lib/orders";
import { createRazorpayOrder, paymentMode, razorpayKeyId, razorpaySecret } from "@/lib/payments";
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
    };

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Step 1: check the address, price the order on the server, create it, and start the payment. */
export async function startCheckout(fd: FormData): Promise<CheckoutResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };

  const slug = text(fd, "slug");
  const qty = Number(fd.get("qty"));
  const name = text(fd, "ship_name");
  const mobile = cleanIndianMobile(text(fd, "ship_phone"));
  const line1 = text(fd, "ship_line1");
  const line2 = text(fd, "ship_line2");
  const city = text(fd, "ship_city");
  const state = text(fd, "ship_state");
  const pincode = text(fd, "ship_pincode");

  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `Quantity must be between 1 and ${MAX_QTY}.` };
  if (name.length < 2) return { error: "Enter the name for delivery." };
  if (!mobile) return { error: "Enter a valid 10-digit mobile number for the courier." };
  if (line1.length < 5) return { error: "Enter the house / street address." };
  if (!city) return { error: "Enter the city." };
  if (!(INDIAN_STATES as readonly string[]).includes(state)) return { error: "Choose the state." };
  if (!/^[1-9]\d{5}$/.test(pincode)) return { error: "PIN code should be 6 digits." };

  // Price from the database, never from the browser
  const supabase = await createClient();
  const { data: book } = await supabase.from("books").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!book) return { error: "This book is no longer available." };
  const settings = await getPricingSettings();
  const priced = priceLine(book, qty, settings);
  if (!priced) return { error: "This book can't be ordered right now. Please try again later." };

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
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      total: priced.total,
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

  const { error: itemError } = await admin.from("order_items").insert({ ...priced.item, order_id: order.id });
  if (itemError) {
    await admin.from("orders").delete().eq("id", order.id);
    return { error: "Could not create the order. Please try again." };
  }

  // Remember the address for next time
  if (!profile.pincode || !profile.city) {
    await supabase.from("profiles").update({ city: profile.city ?? city, pincode: profile.pincode ?? pincode }).eq("id", profile.id);
  }

  let razorpayOrderId: string;
  if (mode === "razorpay") {
    try {
      razorpayOrderId = await createRazorpayOrder({
        amountRupees: priced.total,
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
    amountPaise: Math.round(priced.total * 100),
    name,
    phone: mobile,
  };
}

/** Step 2: the browser reports a successful payment. We check Razorpay's signature before trusting it. */
export async function confirmPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ ok: true } | { error: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, razorpay_order_id, status")
    .eq("id", input.orderId)
    .single();
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

  const res = await markOrderPaid(order.id, input.razorpayPaymentId, mode);
  if (!res.ok) return { error: "Payment received, but we couldn't update your order. Our team will fix it." };
  return { ok: true };
}
