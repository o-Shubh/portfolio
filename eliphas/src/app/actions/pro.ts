"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { confirmPaymentRecord, startProPurchase, type PaymentStart } from "@/lib/billing";
import { proStatus } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProActionState = { error?: string; ok?: string } | undefined;

/** Starts a prepaid month of Pro. Access starts only after the payment is verified on the server. */
export async function buyPro(): Promise<{ error: string } | { start: PaymentStart }> {
  const profile = await requireRole(["author", "admin"]);
  if (!profile.author_terms_accepted_at) return { error: "Please accept the author terms first." };
  return startProPurchase(profile.id);
}

export async function confirmProPayment(input: { paymentId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const profile = await requireRole(["author", "admin"]);
  const res = await confirmPaymentRecord(profile.id, input);
  revalidatePath("/author", "layout");
  return res;
}

/** Requests one template-based promotional creative using a Pro credit. */
export async function requestCreative(_prev: ProActionState, fd: FormData): Promise<ProActionState> {
  const profile = await requireRole(["author", "admin"]);
  const bookId = String(fd.get("book_id") ?? "");
  const format = String(fd.get("format") ?? "").trim().slice(0, 100);
  const brief = String(fd.get("brief") ?? "").trim().slice(0, 2000);
  if (fd.get("rights") !== "on") return { error: "Please confirm you have the rights to the content we'll use." };
  if (brief.length < 10) return { error: "Tell us what the creative should say or show." };
  if (!format) return { error: "Choose a format." };

  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, title, author_name, author_id").eq("id", bookId).maybeSingle();
  if (!book || book.author_id !== profile.id) return { error: "Choose one of your books." };

  // Spend the credit first, inside the database, so concurrent requests can't overspend
  const orderId = randomUUID();
  const { data: periodId, error: creditError } = await admin.rpc("use_pro_credit", { p_author: profile.id, p_service_order: orderId });
  if (creditError || !periodId) {
    const msg = creditError?.message ?? "";
    if (msg.includes("NO_ACTIVE_PRO")) return { error: "Promotional creatives are part of Pro. Your Pro access isn't active." };
    if (msg.includes("NO_CREDITS_LEFT")) return { error: "You've used this period's creative credits. They reset when your next paid period starts." };
    return { error: "Could not use a credit. Please try again." };
  }
  const { error } = await admin.from("service_orders").insert({
    id: orderId,
    author_id: profile.id,
    kind: "pro_creative",
    status: "queued",
    book_id: book.id,
    pro_period_id: periodId as string,
    revisions_allowed: 1,
    rights_confirmed: true,
    submitted_at: new Date().toISOString(),
    requirements: { title: book.title, author_name: book.author_name, output_formats: format, preferences: brief },
  });
  if (error) {
    // Give the credit back if the order couldn't be saved
    await admin.from("pro_credit_ledger").insert({
      author_id: profile.id,
      period_id: periodId as string,
      delta: 1,
      reason: "return",
      note: "Request could not be saved",
    });
    return { error: "Could not save the request. Your credit was not used." };
  }
  await admin.from("service_events").insert({ service_order_id: orderId, actor_id: profile.id, to_status: "queued", note: "Pro creative requested (1 credit)" });
  revalidatePath("/author", "layout");
  redirect(`/author/services/${orderId}`);
}

/** Creates a trackable link to one of the author's books (Pro). */
export async function createCampaignLink(_prev: ProActionState, fd: FormData): Promise<ProActionState> {
  const profile = await requireRole(["author", "admin"]);
  const status = await proStatus(profile.id);
  if (!status.active) return { error: "Campaign links are part of Pro." };
  const bookId = String(fd.get("book_id") ?? "");
  const label = String(fd.get("label") ?? "").trim().slice(0, 80);
  if (label.length < 2) return { error: "Give the link a name, e.g. Instagram bio." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, author_id, status").eq("id", bookId).maybeSingle();
  if (!book || book.author_id !== profile.id) return { error: "Choose one of your books." };
  if (book.status !== "published") return { error: "Only live books can have campaign links." };
  for (let i = 0; i < 3; i++) {
    const code = randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8).padEnd(8, "x");
    const { error } = await admin.from("campaign_links").insert({ author_id: profile.id, book_id: book.id, code, label });
    if (!error) {
      revalidatePath("/author/analytics");
      return { ok: "Link created." };
    }
  }
  return { error: "Could not create the link. Please try again." };
}

export async function archiveCampaignLink(linkId: string): Promise<ProActionState> {
  const profile = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  await admin.from("campaign_links").update({ archived: true }).eq("id", linkId).eq("author_id", profile.id);
  revalidatePath("/author/analytics");
  return { ok: "Archived." };
}
