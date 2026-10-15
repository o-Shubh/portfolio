"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { cancelOrder, refundOrder } from "@/lib/refunds";
import { createClient } from "@/lib/supabase/server";

export type OrderActionState = { error?: string; ok?: string } | undefined;

function refundMessage(r: Awaited<ReturnType<typeof refundOrder>>) {
  if (!r.ok) return { error: "Order cancelled, but the refund didn't start yet. Our team has been alerted and will refund you." };
  if (r.status === "none") return { ok: "Order cancelled." };
  return { ok: "Order cancelled. Your refund has started and usually reaches your account in 5–7 working days." };
}

/** A buyer cancels their own order before printing starts. */
export async function cancelMyOrder(orderId: string): Promise<OrderActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };
  // Ownership check through the buyer's own access rules
  const supabase = await createClient();
  const { data: own } = await supabase.from("orders").select("id").eq("id", orderId).eq("buyer_id", profile.id).maybeSingle();
  if (!own) return { error: "Order not found." };

  const res = await cancelOrder(orderId, "buyer", "Cancelled by buyer");
  if (!res.ok) return { error: res.reason };
  revalidatePath("/account", "layout");
  return refundMessage(res.refund);
}

/** An admin cancels an order that hasn't shipped, with a reason, and refunds it. */
export async function adminCancelOrder(orderId: string, _prev: OrderActionState, fd: FormData): Promise<OrderActionState> {
  await requireRole(["admin"]);
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 200);
  if (reason.length < 3) return { error: "Add a short reason. The buyer sees it." };
  const res = await cancelOrder(orderId, "admin", reason);
  if (!res.ok) return { error: res.reason };
  revalidatePath("/admin/orders");
  revalidatePath("/printer", "layout");
  const r = res.refund;
  if (!r.ok) return { error: `Cancelled, but the refund failed: ${r.reason}` };
  return { ok: r.status === "none" ? "Cancelled (it was never paid)." : "Cancelled and refund started." };
}

/** Try a failed refund again. */
export async function retryRefund(orderId: string): Promise<OrderActionState> {
  await requireRole(["admin"]);
  const r = await refundOrder(orderId);
  revalidatePath("/admin/orders");
  return r.ok ? { ok: "Refund started." } : { error: r.reason };
}
