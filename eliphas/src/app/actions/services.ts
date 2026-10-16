"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { confirmPaymentRecord, startQuotePayment, type PaymentStart } from "@/lib/billing";
import { logAudit } from "@/lib/plans";
import { bookRequirements } from "@/lib/book-services";
import { checkAddOns, missingRequirements, NEEDS_MANUSCRIPT, OPEN_SERVICE_STATUSES, REQUIREMENT_FIELDS, type ServiceOrder } from "@/lib/services";
import { getPricingSettings } from "@/lib/settings";
import { cancelService, moveService } from "@/lib/services-server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ServiceActionState = { error?: string; ok?: string } | undefined;

/** The logged-in author's own service order, or null. */
async function ownOrder(orderId: string) {
  const profile = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  const { data: order } = await admin.from("service_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.author_id !== profile.id) return { profile, order: null as ServiceOrder | null };
  return { profile, order };
}

const refresh = (id: string) => {
  revalidatePath(`/author/services/${id}`);
  revalidatePath("/author/services");
  revalidatePath("/author");
  revalidatePath("/admin/services", "layout");
};

/** Starts a new service order from the current catalogue version. No payment yet. */
export async function createServiceOrder(code: string): Promise<ServiceActionState> {
  const profile = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  const { data: item } = await admin.from("current_service_catalog").select("*").eq("code", code).maybeSingle();
  if (!item || !item.active || !item.id) return { error: "This service isn't available right now." };
  const { data: order, error } = await admin
    .from("service_orders")
    .insert({ author_id: profile.id, kind: "service", catalog_id: item.id, requirements: { author_name: profile.full_name ?? "" } })
    .select("id")
    .single();
  if (error || !order) return { error: "Could not start the order. Please try again." };
  await admin.from("service_events").insert({ service_order_id: order.id, actor_id: profile.id, to_status: "requirements_pending", note: `Started: ${item.name}` });
  redirect(`/author/services/${order.id}`);
}

/**
 * Requests one or more services for one of the author's books in a single step ("add-ons").
 * Each request is pre-filled from the book. Ones with nothing missing go straight to scope review;
 * the author fills in the rest for the others. Nothing is charged: a fixed quote comes first.
 */
export async function requestBookServices(bookId: string, _prev: ServiceActionState, fd: FormData): Promise<ServiceActionState> {
  const profile = await requireRole(["author", "admin"]);
  if (fd.get("rights") !== "on") return { error: "Please confirm you have the rights to this book's text and any images you provide." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("*").eq("id", bookId).maybeSingle();
  if (!book || book.author_id !== profile.id) return { error: "Book not found." };

  const { data: existing } = await admin
    .from("service_orders")
    .select("status, service_catalog(code)")
    .eq("book_id", book.id)
    .eq("kind", "service")
    .in("status", OPEN_SERVICE_STATUSES);
  const open = new Set((existing ?? []).map((o) => o.service_catalog?.code).filter((c): c is string => Boolean(c)));
  const checked = checkAddOns(fd.getAll("service").map(String), open);
  if ("error" in checked) return { error: checked.error };

  const { data: catalog } = await admin.from("current_service_catalog").select("*").in("code", checked.ok);
  const items = checked.ok.map((code) => catalog?.find((c) => c.code === code && c.active && c.id));
  if (items.some((i) => !i)) return { error: "One of these services isn't available right now. Refresh the page." };

  const { rates } = await getPricingSettings();
  const reqs = bookRequirements(book, rates, profile.full_name);
  const now = new Date().toISOString();
  const submitted: string[] = [];
  const needDetails: string[] = [];
  for (const item of items as NonNullable<(typeof items)[number]>[]) {
    // The book's own manuscript counts as the file we need to check length before quoting
    const ready = missingRequirements(item.requires ?? ["title", "author_name"], reqs).length === 0 && (!NEEDS_MANUSCRIPT.has(item.code!) || Boolean(book.manuscript_path));
    const { data: order, error } = await admin
      .from("service_orders")
      .insert({
        author_id: profile.id,
        kind: "service",
        catalog_id: item.id!,
        book_id: book.id,
        requirements: reqs,
        rights_confirmed: true,
        status: ready ? "scope_review" : "requirements_pending",
        submitted_at: ready ? now : null,
      })
      .select("id")
      .single();
    if (error || !order) return { error: "Could not save your request. Please try again." };
    await admin.from("service_events").insert({
      service_order_id: order.id,
      actor_id: profile.id,
      to_status: ready ? "scope_review" : "requirements_pending",
      note: `Requested for “${book.title}”: ${item.name}${ready ? " (details taken from the book)" : ""}`,
    });
    (ready ? submitted : needDetails).push(item.name!);
  }
  await logAudit(profile.id, "service.add_ons_requested", "book", book.id, { codes: checked.ok });
  revalidatePath(`/author/books/${book.id}`, "layout");
  revalidatePath("/author/services");
  revalidatePath("/admin/services", "layout");
  const parts = [];
  if (submitted.length) parts.push(`${submitted.join(", ")}: sent for review. You'll get a fixed quote before paying.`);
  if (needDetails.length) parts.push(`${needDetails.join(", ")}: add a few more details on the Services page to get a quote.`);
  return { ok: `Requested. ${parts.join(" ")}` };
}

/** Saves requirement fields while the order is collecting requirements. */
export async function saveRequirements(orderId: string, _prev: ServiceActionState, fd: FormData): Promise<ServiceActionState> {
  const { order, profile } = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (order.status !== "requirements_pending") return { error: "Requirements can't be changed after you submit them. Contact us if something changed." };
  const reqs: Record<string, string> = {};
  for (const f of REQUIREMENT_FIELDS) {
    const v = String(fd.get(f.key) ?? "").trim();
    if (v.length > 4000) return { error: `${f.label} is too long.` };
    if (f.type === "number" && v && !/^\d{1,7}$/.test(v)) return { error: `${f.label} must be a whole number.` };
    if (v) reqs[f.key] = v;
  }
  const admin = createAdminClient();
  await admin
    .from("service_orders")
    .update({ requirements: reqs, rights_confirmed: fd.get("rights") === "on" })
    .eq("id", order.id);
  if (fd.get("submit") === "1") return submitRequirements(order.id, profile.id);
  refresh(order.id);
  return { ok: "Saved." };
}

/** Records a file the author uploaded (the upload itself goes straight to private storage). */
export async function recordRequirementFile(orderId: string, input: { path: string; fileName: string; size: number; kind: "requirement" | "reference" }) {
  const { order, profile } = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (!["requirements_pending", "scope_review"].includes(order.status)) return { error: "Files can't be added at this stage." };
  if (!input.path.startsWith(`${order.id}/${input.kind}/`)) return { error: "Invalid file location." };
  const admin = createAdminClient();
  const { count } = await admin.from("service_files").select("*", { count: "exact", head: true }).eq("service_order_id", order.id).eq("kind", input.kind);
  const { error } = await admin.from("service_files").insert({
    service_order_id: order.id,
    uploaded_by: profile.id,
    kind: input.kind,
    path: input.path,
    file_name: input.fileName.slice(0, 200),
    size_bytes: input.size,
    version: (count ?? 0) + 1,
  });
  if (error) return { error: "Could not save the file record." };
  refresh(order.id);
  return { ok: "Uploaded." };
}

async function submitRequirements(orderId: string, actorId: string): Promise<ServiceActionState> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("service_orders").select("*, service_catalog(code, requires)").eq("id", orderId).single();
  if (!order) return { error: "Order not found." };
  const required = order.service_catalog?.requires ?? ["title", "author_name"];
  const missing = missingRequirements(required, order.requirements as Record<string, unknown>);
  if (missing.length) {
    const labels = missing.map((k) => REQUIREMENT_FIELDS.find((f) => f.key === k)?.label ?? k);
    return { error: `Please fill in: ${labels.join(", ")}.` };
  }
  if (!order.rights_confirmed) return { error: "Please confirm you have the rights to the content you uploaded." };
  if (order.service_catalog && NEEDS_MANUSCRIPT.has(order.service_catalog.code)) {
    const { count } = await admin.from("service_files").select("*", { count: "exact", head: true }).eq("service_order_id", orderId).eq("kind", "requirement");
    // A request made for a book can use that book's uploaded manuscript
    const { data: book } = order.book_id ? await admin.from("books").select("manuscript_path").eq("id", order.book_id).maybeSingle() : { data: null };
    if (!count && !book?.manuscript_path) return { error: "Please upload your manuscript so we can check length and complexity before quoting." };
  }
  const moved = await moveService(order, "scope_review", actorId, "Requirements submitted", { submitted_at: new Date().toISOString() });
  if (!moved) return { error: "This order has already moved on. Refresh the page." };
  refresh(orderId);
  return { ok: "Submitted. We'll review the scope and send you a fixed quote." };
}

/** The author accepts a quote (its price, deliverables, revisions and delivery date). */
export async function acceptQuote(quoteId: string): Promise<ServiceActionState> {
  const profile = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  const { data: q } = await admin.from("service_quotes").select("*, service_orders(*)").eq("id", quoteId).single();
  const order = q?.service_orders;
  if (!q || !order || order.author_id !== profile.id) return { error: "Quote not found." };
  if (q.status !== "issued" || order.status !== "quote_awaiting_acceptance") return { error: "This quote is no longer open." };
  const { data: updated } = await admin
    .from("service_quotes")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", q.id)
    .eq("status", "issued")
    .select("id");
  if (!updated?.length) return { error: "This quote is no longer open." };
  await moveService(order, "payment_pending", profile.id, "Quote accepted");
  await logAudit(profile.id, "service_quote.accepted", "service_quote", q.id, { total_paise: q.total_paise });
  refresh(order.id);
  return { ok: "Quote accepted." };
}

/** The author declines a quote (e.g. to ask a question). The order goes back to scope review. */
export async function declineQuote(quoteId: string, _prev: ServiceActionState, fd: FormData): Promise<ServiceActionState> {
  const profile = await requireRole(["author", "admin"]);
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 1000);
  if (reason.length < 3) return { error: "Tell us what you'd like changed." };
  const admin = createAdminClient();
  const { data: q } = await admin.from("service_quotes").select("*, service_orders(*)").eq("id", quoteId).single();
  const order = q?.service_orders;
  if (!q || !order || order.author_id !== profile.id) return { error: "Quote not found." };
  if (q.status !== "issued") return { error: "This quote is no longer open." };
  await admin.from("service_quotes").update({ status: "declined" }).eq("id", q.id);
  await moveService(order, "scope_review", profile.id, `Quote declined: ${reason}`);
  refresh(order.id);
  return { ok: "Sent. We'll get back to you with an updated quote." };
}

export async function payServiceQuote(quoteId: string): Promise<{ error: string } | { start: PaymentStart }> {
  const profile = await requireRole(["author", "admin"]);
  return startQuotePayment(profile.id, quoteId);
}

export async function confirmServicePayment(input: { paymentId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const profile = await requireRole(["author", "admin"]);
  const res = await confirmPaymentRecord(profile.id, input);
  revalidatePath("/author", "layout");
  return res;
}

/** Requests one of the included revisions, with notes. */
export async function requestRevision(orderId: string, _prev: ServiceActionState, fd: FormData): Promise<ServiceActionState> {
  const { order, profile } = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 4000);
  if (note.length < 5) return { error: "Describe the changes you need." };
  if (order.status !== "author_review") return { error: "There's nothing to review right now." };
  if (order.revisions_used >= order.revisions_allowed) {
    return { error: "You've used the included revisions. Ask us for a quote for more changes." };
  }
  const moved = await moveService(order, "revision_requested", profile.id, `Revision ${order.revisions_used + 1}: ${note}`, {
    revisions_used: order.revisions_used + 1,
  });
  if (!moved) return { error: "This order has already moved on. Refresh the page." };
  refresh(order.id);
  return { ok: "Revision requested." };
}

/** Asks for a quote for work beyond the included revisions. Nothing is charged without a new accepted quote. */
export async function requestExtraWork(orderId: string, _prev: ServiceActionState, fd: FormData): Promise<ServiceActionState> {
  const { order, profile } = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 4000);
  if (note.length < 5) return { error: "Describe the extra changes you need." };
  if (!["author_review", "completed"].includes(order.status)) return { error: "You can ask for extra work once files are delivered." };
  const admin = createAdminClient();
  await admin.from("service_events").insert({
    service_order_id: order.id,
    actor_id: profile.id,
    from_status: order.status,
    to_status: order.status,
    note: `Extra work requested (needs a quote): ${note}`,
  });
  refresh(order.id);
  return { ok: "Sent. We'll reply with a quote; nothing is charged unless you accept it." };
}

/** Approves the delivered files. Final print files must have passed the quality check. */
export async function approveDelivery(orderId: string): Promise<ServiceActionState> {
  const { order, profile } = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (order.status !== "author_review") return { error: "There's nothing to approve right now." };
  const admin = createAdminClient();
  const { count } = await admin.from("service_files").select("*", { count: "exact", head: true }).eq("service_order_id", order.id).in("kind", ["final", "draft"]);
  if (!count) return { error: "No files have been delivered yet." };
  const moved = await moveService(order, "completed", profile.id, "Approved by author", { completed_at: new Date().toISOString() });
  if (!moved) return { error: "This order has already moved on. Refresh the page." };
  refresh(order.id);
  return { ok: "Approved. Thank you!" };
}

export async function cancelMyService(orderId: string): Promise<ServiceActionState> {
  const { order, profile } = await ownOrder(orderId);
  if (!order) return { error: "Order not found." };
  const res = await cancelService(order, { id: profile.id, role: "author" }, "Cancelled by author");
  if ("error" in res) return { error: res.error };
  refresh(order.id);
  return { ok: res.refundedPaise > 0 ? "Cancelled. Your payment is being refunded in full." : "Cancelled." };
}
