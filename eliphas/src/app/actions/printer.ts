"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { cleanTrackingUrl } from "@/lib/couriers";
import { sendOrderEmail } from "@/lib/order-emails";
import { PRINTER_NEXT, type OrderStatus } from "@/lib/order-status";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string } | undefined;

/**
 * Moves an order one step forward (accept → printing → packed → shipped → delivered).
 * Only the printer the order is assigned to (or an admin) may do this, and only
 * one step at a time.
 */
export async function advanceOrder(orderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(["printer", "admin"]);
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("id, status, printer_id").eq("id", orderId).single();
  if (!order) return { error: "Order not found." };

  if (profile.role !== "admin") {
    const supabase = await createClient();
    const { data: mine } = await supabase.from("printers").select("id").eq("user_id", profile.id).maybeSingle();
    if (!mine || mine.id !== order.printer_id) return { error: "This order isn't assigned to you." };
  }

  const next = PRINTER_NEXT[order.status as OrderStatus];
  if (!next || fd.get("to") !== next.to) return { error: "This order has already moved on. Refresh the page." };

  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["orders"]["Update"] = { status: next.to };
  if (next.to === "accepted") update.accepted_at = now;
  if (next.to === "printing") update.printing_at = now;
  if (next.to === "packed") Object.assign(update, { packed_at: now, printed_at: now });
  if (next.to === "delivered") update.delivered_at = now;
  if (next.to === "shipped") {
    const courier = String(fd.get("courier") ?? "").trim();
    const tracking = String(fd.get("tracking_number") ?? "").trim();
    if (courier.length < 2) return { error: "Enter the courier name." };
    if (!/^[A-Za-z0-9-]{6,40}$/.test(tracking)) return { error: "Enter the tracking number (letters and numbers)." };
    const rawUrl = String(fd.get("tracking_url") ?? "").trim();
    const trackingUrl = cleanTrackingUrl(rawUrl);
    if (rawUrl && !trackingUrl) return { error: "The tracking link must be a full https:// address, or leave it empty." };
    Object.assign(update, { courier, tracking_number: tracking, tracking_url: trackingUrl, shipped_at: now });
  }

  const { data: moved, error } = await admin.from("orders").update(update).eq("id", orderId).eq("status", order.status).select("id");
  if (error) return { error: "Could not update. Please try again." };
  if (!moved?.length) return { error: "This order has already moved on. Refresh the page." };
  if (next.to === "shipped") await sendOrderEmail(orderId, "order_shipped");
  if (next.to === "delivered") await sendOrderEmail(orderId, "order_delivered");

  revalidatePath("/printer", "layout");
  revalidatePath("/admin/orders");
  return { ok: "Updated." };
}
