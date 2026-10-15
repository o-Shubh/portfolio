"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { refundPaymentRecord } from "@/lib/billing";
import { percentOf } from "@/lib/commission";
import type { Json } from "@/lib/database.types";
import { logAudit } from "@/lib/plans";
import { QC_ITEMS } from "@/lib/services";
import { cancelService, moveService, noteService } from "@/lib/services-server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminMoneyState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const rupeesToPaise = (v: string) => (/^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : NaN);
const num = (v: string) => (v === "" ? NaN : Number(v));

async function admin() {
  const profile = await requireRole(["admin"]);
  return { profile, db: createAdminClient() };
}

// ---------------------------------------------------------------------------
// Plans: new versions apply from their effective date; old versions stay for history
// ---------------------------------------------------------------------------
export async function createPlanVersion(_prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const plan = text(fd, "plan");
  if (!["free", "pro"].includes(plan)) return { error: "Choose Free or Pro." };
  const price = plan === "pro" ? rupeesToPaise(text(fd, "price")) : 0;
  const percent = num(text(fd, "commission_percent"));
  const min = rupeesToPaise(text(fd, "commission_min"));
  const gst = num(text(fd, "gst_percent"));
  const credits = plan === "pro" ? num(text(fd, "credits")) : 0;
  const effective = text(fd, "effective_from");
  const note = text(fd, "note").slice(0, 500);
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be a rupee amount." };
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) return { error: "Commission must be 0–50%." };
  if (!Number.isFinite(min) || min < 0) return { error: "Minimum commission must be a rupee amount." };
  if (!Number.isFinite(gst) || gst < 0 || gst > 40) return { error: "GST must be 0–40%." };
  if (!Number.isInteger(credits) || credits < 0 || credits > 50) return { error: "Credits must be a whole number." };
  const eff = new Date(effective);
  if (Number.isNaN(eff.getTime()) || eff.getTime() < Date.now() - 60_000) return { error: "Effective date must be now or in the future." };
  if (note.length < 5) return { error: "Add a short note explaining the change." };

  const { data: last } = await db.from("plan_versions").select("version").eq("plan", plan).order("version", { ascending: false }).limit(1).single();
  const row = {
    plan,
    version: (last?.version ?? 0) + 1,
    price_paise: price,
    gst_percent: gst,
    credits_per_period: credits,
    commission_percent: percent,
    commission_min_paise: min,
    commission_gst_percent: gst,
    effective_from: eff.toISOString(),
    note,
    created_by: profile.id,
  };
  const { data, error } = await db.from("plan_versions").insert(row).select("id").single();
  if (error) return { error: "Could not save the new version." };
  await logAudit(profile.id, "plan_version.created", "plan_version", data.id, row);
  revalidatePath("/", "layout");
  return { ok: `Saved ${plan} version ${row.version}. It applies to orders and new subscriptions from ${eff.toLocaleString("en-IN")}.` };
}

export async function saveTermsAndTax(_prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const version = text(fd, "terms_version");
  const effective = text(fd, "terms_effective_from");
  const summary = text(fd, "terms_summary").slice(0, 600);
  const gst = num(text(fd, "platform_gst_percent"));
  if (!/^[\w.-]{2,20}$/.test(version)) return { error: "Terms version should be short, e.g. 2026-11." };
  if (Number.isNaN(new Date(effective).getTime())) return { error: "Enter the terms effective date." };
  if (summary.length < 20) return { error: "Write a short summary of the terms for authors." };
  if (!Number.isFinite(gst) || gst < 0 || gst > 40) return { error: "GST must be 0–40%." };
  const terms = { version, effective_from: effective, summary };
  const tax = {
    platform_gst_percent: gst,
    gst_registered: fd.get("gst_registered") === "on",
    withholding_configured: fd.get("withholding_configured") === "on",
    review_note: text(fd, "review_note").slice(0, 600),
  };
  await db.from("settings").update({ value: terms as unknown as NonNullable<Json>, updated_by: profile.id }).eq("key", "commission_terms");
  await db.from("settings").update({ value: tax as unknown as NonNullable<Json>, updated_by: profile.id }).eq("key", "tax");
  await logAudit(profile.id, "settings.terms_tax", "settings", "commission_terms,tax", { terms, tax });
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

// ---------------------------------------------------------------------------
// Service catalogue: every edit is a new version; existing orders keep theirs
// ---------------------------------------------------------------------------
export async function saveCatalogVersion(code: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const { data: cur } = await db.from("current_service_catalog").select("*").eq("code", code).maybeSingle();
  if (!cur) return { error: "Service not found." };
  const lines = (k: string) =>
    text(fd, k)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  const pricing = cur.pricing as "fixed" | "quote";
  const row = {
    code,
    version: (cur.version ?? 0) + 1,
    name: text(fd, "name").slice(0, 80) || cur.name!,
    pricing,
    price_paise: pricing === "fixed" ? rupeesToPaise(text(fd, "price")) : null,
    min_paise: pricing === "quote" ? rupeesToPaise(text(fd, "min")) : null,
    max_paise: pricing === "quote" ? rupeesToPaise(text(fd, "max")) : null,
    gst_percent: num(text(fd, "gst_percent")),
    revision_rounds: num(text(fd, "revision_rounds")),
    deliverables: lines("deliverables"),
    scope: text(fd, "scope").slice(0, 2000),
    exclusions: lines("exclusions"),
    requires: cur.requires ?? [],
    sort: cur.sort ?? 0,
    active: fd.get("active") === "on",
    created_by: profile.id,
  };
  if (pricing === "fixed" && !(Number(row.price_paise) > 0)) return { error: "Enter the fixed price." };
  if (pricing === "quote" && !(Number(row.min_paise) > 0 && Number(row.max_paise) >= Number(row.min_paise))) return { error: "Enter a valid price range." };
  if (!Number.isFinite(row.gst_percent) || row.gst_percent < 0 || row.gst_percent > 40) return { error: "GST must be 0–40%." };
  if (!Number.isInteger(row.revision_rounds) || row.revision_rounds < 0 || row.revision_rounds > 10) return { error: "Revisions must be 0–10." };
  if (row.scope.length < 20) return { error: "Describe the scope." };
  const { data, error } = await db.from("service_catalog").insert(row).select("id").single();
  if (error) return { error: "Could not save." };
  await logAudit(profile.id, "service_catalog.version", "service_catalog", data.id, row);
  revalidatePath("/", "layout");
  return { ok: `Saved version ${row.version}. Existing orders keep the version they were placed on.` };
}

// ---------------------------------------------------------------------------
// Service fulfilment (manual queue)
// ---------------------------------------------------------------------------
async function loadOrder(orderId: string) {
  const db = createAdminClient();
  const { data } = await db.from("service_orders").select("*, service_catalog(*)").eq("id", orderId).single();
  return data;
}
const refresh = (id: string) => {
  revalidatePath(`/admin/services/orders/${id}`);
  revalidatePath("/admin/services", "layout");
  revalidatePath(`/author/services/${id}`);
};

/** Issues a fixed quote: price, GST, deliverables, revisions and an honest delivery date. */
export async function issueQuote(orderId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const order = await loadOrder(orderId);
  if (!order) return { error: "Order not found." };
  const kind = text(fd, "kind") === "additional" ? "additional" : "initial";
  const allowedFrom = kind === "initial" ? ["scope_review"] : ["author_review", "completed"];
  if (!allowedFrom.includes(order.status)) return { error: kind === "initial" ? "Quotes are issued during scope review." : "Additional work is quoted after delivery." };

  const base = rupeesToPaise(text(fd, "price"));
  const gstPercent = num(text(fd, "gst_percent"));
  const revisions = num(text(fd, "revisions"));
  const deliveryBy = text(fd, "delivery_by");
  const notes = text(fd, "notes").slice(0, 2000);
  const deliverables = text(fd, "deliverables")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!(base > 0)) return { error: "Enter the price before GST." };
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 40) return { error: "GST must be 0–40%." };
  if (!Number.isInteger(revisions) || revisions < 0 || revisions > 10) return { error: "Revisions must be 0–10." };
  if (!deliverables.length) return { error: "List the deliverables." };
  const by = new Date(deliveryBy);
  if (Number.isNaN(by.getTime()) || by.getTime() < Date.now() - 86_400_000) return { error: "Set a delivery date that hasn't passed." };

  // Price must match the catalogue unless the scope is different, and that must be explained
  const cat = order.service_catalog;
  if (kind === "initial" && cat) {
    const outOfRange =
      cat.pricing === "fixed" ? base !== cat.price_paise : base < (cat.min_paise ?? 0) || base > (cat.max_paise ?? Infinity);
    if (outOfRange && notes.length < 20) {
      return { error: "This price differs from the catalogue. Explain the revised scope in the notes (the author sees it)." };
    }
  }
  const gstPaise = percentOf(base, gstPercent);
  await db.from("service_quotes").update({ status: "superseded" }).eq("service_order_id", order.id).eq("status", "issued");
  const { data: q, error } = await db
    .from("service_quotes")
    .insert({
      service_order_id: order.id,
      kind,
      base_paise: base,
      gst_percent: gstPercent,
      gst_paise: gstPaise,
      total_paise: base + gstPaise,
      deliverables,
      revisions,
      delivery_by: deliveryBy,
      notes: notes || null,
      issued_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not save the quote." };
  const moved = await moveService(order, "quote_awaiting_acceptance", profile.id, `Quote issued: ₹${(base + gstPaise) / 100} incl. GST, delivery by ${deliveryBy}`);
  if (!moved) return { error: "The order changed while you were quoting. Refresh." };
  await logAudit(profile.id, "service_quote.issued", "service_quote", q.id, { order: order.id, kind, base, gstPercent, revisions, deliveryBy });
  refresh(order.id);
  return { ok: "Quote sent to the author." };
}

export async function sendBackForRequirements(orderId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile } = await admin();
  const order = await loadOrder(orderId);
  const note = text(fd, "note");
  if (!order) return { error: "Order not found." };
  if (note.length < 5) return { error: "Tell the author what is missing." };
  const moved = await moveService(order, "requirements_pending", profile.id, `Needs more information: ${note}`);
  if (!moved) return { error: "Only orders in scope review can be sent back." };
  refresh(order.id);
  return { ok: "Sent back to the author." };
}

export async function startServiceWork(orderId: string): Promise<AdminMoneyState> {
  const { profile } = await admin();
  const order = await loadOrder(orderId);
  if (!order) return { error: "Order not found." };
  const to = order.status === "queued" || order.status === "revision_requested" ? "in_progress" : null;
  if (!to) return { error: "Work can start once the order is paid and queued (or a revision is requested)." };
  const moved = await moveService(order, to, profile.id, order.status === "queued" ? "Work started" : "Working on revision", order.started_at ? {} : { started_at: new Date().toISOString() });
  if (!moved) return { error: "The order changed. Refresh." };
  refresh(order.id);
  return { ok: "Started." };
}

/** Records a delivered file (the upload goes straight to private storage from the admin's browser). */
export async function recordDeliverable(orderId: string, input: { path: string; fileName: string; size: number; kind: "draft" | "final"; note?: string }) {
  const { profile, db } = await admin();
  const order = await loadOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (!["in_progress", "revision_requested"].includes(order.status)) return { error: "Start the work before uploading deliverables." };
  if (!input.path.startsWith(`${order.id}/${input.kind}/`)) return { error: "Invalid file location." };
  const { count } = await db.from("service_files").select("*", { count: "exact", head: true }).eq("service_order_id", order.id).eq("kind", input.kind);
  await db.from("service_files").insert({
    service_order_id: order.id,
    uploaded_by: profile.id,
    kind: input.kind,
    path: input.path,
    file_name: input.fileName.slice(0, 200),
    size_bytes: input.size,
    version: (count ?? 0) + 1,
    note: input.note?.slice(0, 500) ?? null,
  });
  refresh(order.id);
  return { ok: "Uploaded." };
}

/** Sends delivered files to the author. Final print files need the full quality check. */
export async function sendForReview(orderId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const order = await loadOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (order.status !== "in_progress") return { error: "Only work in progress can be sent for review." };
  const { data: files } = await db.from("service_files").select("kind").eq("service_order_id", order.id).in("kind", ["draft", "final"]);
  if (!files?.length) return { error: "Upload at least one file first." };
  let qc: Record<string, boolean> | null = null;
  if (files.some((f) => f.kind === "final") && order.kind === "service") {
    qc = Object.fromEntries(QC_ITEMS.map((i) => [i.key, fd.get(`qc_${i.key}`) === "on"]));
    const missing = QC_ITEMS.filter((i) => !qc![i.key]).map((i) => i.label);
    if (missing.length) return { error: `Final print files need the quality check: ${missing.join(", ")}.` };
  }
  const note = text(fd, "note").slice(0, 2000);
  const moved = await moveService(order, "author_review", profile.id, note || "Files ready for review", qc ? { qc: { ...qc, checked_by: profile.id, checked_at: new Date().toISOString() } } : {});
  if (!moved) return { error: "The order changed. Refresh." };
  refresh(order.id);
  return { ok: "Sent to the author for review." };
}

export async function adminNoteService(orderId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile } = await admin();
  const note = text(fd, "note").slice(0, 2000);
  if (note.length < 2) return { error: "Write a note." };
  await noteService(orderId, profile.id, note);
  refresh(orderId);
  return { ok: "Note added." };
}

export async function adminCancelService(orderId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile } = await admin();
  const order = await loadOrder(orderId);
  if (!order) return { error: "Order not found." };
  const reason = text(fd, "reason");
  if (reason.length < 5) return { error: "Give a reason (the author sees it)." };
  const refund = rupeesToPaise(text(fd, "refund") || "0");
  if (!Number.isFinite(refund)) return { error: "Refund must be a rupee amount." };
  const res = await cancelService(order, { id: profile.id, role: "admin" }, reason, refund);
  if ("error" in res) return { error: res.error };
  refresh(order.id);
  return { ok: res.refundedPaise ? `Cancelled and refunded ₹${res.refundedPaise / 100}.` : "Cancelled." };
}

// ---------------------------------------------------------------------------
// Pro: credit adjustments and subscription refunds (audited)
// ---------------------------------------------------------------------------
export async function adjustCredits(authorId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const delta = num(text(fd, "delta"));
  const note = text(fd, "note").slice(0, 500);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 10) return { error: "Enter a whole number between −10 and 10 (not 0)." };
  if (note.length < 5) return { error: "Explain the adjustment." };
  const { data: per } = await db.rpc("active_pro_period", { p_author: authorId });
  const period = Array.isArray(per) ? per[0] : per;
  if (!period?.id) return { error: "This author has no active Pro period." };
  const { data: bal } = await db.rpc("period_credit_balance", { p_period: period.id });
  if (Number(bal) + delta < 0) return { error: "Credits can't go below zero." };
  await db.from("pro_credit_ledger").insert({ author_id: authorId, period_id: period.id, delta, reason: "admin_adjust", actor_id: profile.id, note });
  await logAudit(profile.id, "pro_credits.adjusted", "profile", authorId, { period: period.id, delta, note });
  revalidatePath("/admin/subscriptions");
  return { ok: "Credits adjusted." };
}

/**
 * Refunds a Pro period. Policy: a period that hasn't started is refunded in full and never starts.
 * An active period is ended now; the admin chooses the refund amount (e.g. unused days) and any
 * unused credits are voided. Books, earnings and requests already made are not affected.
 */
export async function refundSubscriptionPeriod(periodId: string, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const reason = text(fd, "reason");
  const amount = rupeesToPaise(text(fd, "amount"));
  if (reason.length < 5) return { error: "Give a reason." };
  const { data: per } = await db.from("subscription_periods").select("*, payments(*)").eq("id", periodId).single();
  if (!per || per.status !== "paid" || !per.payments) return { error: "Only paid periods can be refunded." };
  const now = new Date();
  const notStarted = new Date(per.starts_at!) > now;
  const pay = per.payments;
  const refundPaise = notStarted ? pay.amount_paise - pay.refunded_paise : amount;
  if (!(refundPaise > 0)) return { error: "Enter the refund amount." };
  const r = await refundPaymentRecord(pay.id, refundPaise, profile.id, reason);
  if ("error" in r) return { error: r.error };
  await db
    .from("subscription_periods")
    .update({ status: "refunded", refunded_at: now.toISOString(), refund_note: reason, ...(notStarted ? {} : { ends_at: now.toISOString() }) })
    .eq("id", per.id);
  const { data: bal } = await db.rpc("period_credit_balance", { p_period: per.id });
  if (Number(bal) > 0) {
    await db.from("pro_credit_ledger").insert({ author_id: per.author_id, period_id: per.id, delta: -Number(bal), reason: "refund_void", actor_id: profile.id, note: reason });
  }
  await logAudit(profile.id, "subscription.refunded", "subscription_period", per.id, { refund_paise: refundPaise, not_started: notStarted, reason });
  revalidatePath("/admin/subscriptions");
  return { ok: `Refunded ₹${refundPaise / 100}.` };
}

// ---------------------------------------------------------------------------
// Shipping rates and promotions
// ---------------------------------------------------------------------------
export async function saveShippingZone(zoneId: string | null, _prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const name = text(fd, "name").slice(0, 80);
  const prefixes = text(fd, "prefixes")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const allIndia = fd.get("all_india") === "on";
  const extra = rupeesToPaise(text(fd, "extra") || "0");
  const slabs = text(fd, "slabs")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d+)\s*g?\s*[:=]\s*₹?\s*(\d+(?:\.\d{1,2})?)$/i);
      return m ? { max_weight_g: Number(m[1]), price_paise: Math.round(Number(m[2]) * 100) } : null;
    });
  if (name.length < 2) return { error: "Name the zone." };
  if (!allIndia && (!prefixes.length || prefixes.some((p) => !/^\d{1,6}$/.test(p)))) return { error: "PIN prefixes must be 1–6 digits, separated by commas." };
  if (!slabs.length || slabs.some((s) => !s)) return { error: "Each weight line should look like: 500 = 60" };
  if (!Number.isFinite(extra)) return { error: "Extra per 500 g must be a rupee amount." };
  const row = {
    name,
    pincode_prefixes: allIndia ? [""] : prefixes,
    extra_per_500g_paise: extra,
    active: fd.get("active") === "on",
    is_sample: fd.get("is_sample") === "on",
  };
  let id = zoneId;
  if (id) await db.from("shipping_zones").update(row).eq("id", id);
  else id = (await db.from("shipping_zones").insert(row).select("id").single()).data?.id ?? null;
  if (!id) return { error: "Could not save." };
  await db.from("shipping_rates").delete().eq("zone_id", id);
  await db.from("shipping_rates").insert(slabs.map((s) => ({ ...s!, zone_id: id! })));
  await logAudit(profile.id, "shipping_zone.saved", "shipping_zone", id, { ...row, slabs });
  revalidatePath("/admin/shipping");
  return { ok: "Saved. New checkouts use these rates; confirmed orders keep their charge." };
}

export async function saveShippingPromotion(_prev: AdminMoneyState, fd: FormData): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  const name = text(fd, "name").slice(0, 80);
  const kind = text(fd, "kind") === "free" ? "free" : "flat_off";
  const amount = rupeesToPaise(text(fd, "amount") || "0");
  const min = rupeesToPaise(text(fd, "min_books") || "0");
  const starts = text(fd, "starts_at");
  const ends = text(fd, "ends_at");
  if (name.length < 2) return { error: "Name the promotion (readers see it)." };
  if (kind === "flat_off" && !(amount > 0)) return { error: "Enter the discount amount." };
  if (!Number.isFinite(min)) return { error: "Minimum must be a rupee amount." };
  if (Number.isNaN(new Date(starts).getTime())) return { error: "Enter a start date." };
  const row = {
    name,
    kind,
    amount_paise: kind === "free" ? 0 : amount,
    min_books_paise: min,
    starts_at: new Date(starts).toISOString(),
    ends_at: ends ? new Date(ends).toISOString() : null,
    active: true,
    funded_by: "platform",
    created_by: profile.id,
  };
  const { data } = await db.from("shipping_promotions").insert(row).select("id").single();
  await logAudit(profile.id, "shipping_promotion.created", "shipping_promotion", data?.id ?? null, row);
  revalidatePath("/admin/shipping");
  return { ok: "Promotion saved. It is paid by the platform and never taken from author earnings." };
}

export async function endShippingPromotion(id: string): Promise<AdminMoneyState> {
  const { profile, db } = await admin();
  await db.from("shipping_promotions").update({ active: false, ends_at: new Date().toISOString() }).eq("id", id);
  await logAudit(profile.id, "shipping_promotion.ended", "shipping_promotion", id);
  revalidatePath("/admin/shipping");
  return { ok: "Ended." };
}
