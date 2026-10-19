"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { CONTACT_TOPICS } from "@/lib/contact";
import { queueEmail } from "@/lib/email";
import { parseEmail } from "@/lib/email-format";
import { contactEmail } from "@/lib/email-templates";
import { logAudit } from "@/lib/plans";
import { getBusiness } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContactState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Contact form: anyone can send. A hidden field and per-sender limits keep out spam. */
export async function sendContactMessage(_: ContactState, fd: FormData): Promise<ContactState> {
  if (text(fd, "website")) return { ok: "Thanks. We'll reply within two working days." }; // bots fill the hidden field
  const name = text(fd, "name").slice(0, 80);
  const email = parseEmail(fd.get("email"));
  const phone =
    text(fd, "phone")
      .replace(/[^\d+ -]/g, "")
      .slice(0, 20) || null;
  const topic = text(fd, "topic");
  const orderNumber =
    text(fd, "order_number")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 40) || null;
  const message = text(fd, "message");
  if (name.length < 2) return { error: "Enter your name." };
  if (!email || email === "invalid") return { error: "Enter your email so we can reply." };
  if (!Object.hasOwn(CONTACT_TOPICS, topic)) return { error: "Choose what your message is about." };
  if (message.length < 10) return { error: "Write a little more so we can help (at least 10 characters)." };
  if (message.length > 4000) return { error: "Keep your message under 4,000 characters." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
  const salt = process.env.SUPABASE_SECRET_KEY ?? "eliphas";
  const ipHash = ip ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : null;
  const admin = createAdminClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [byIp, byEmail] = await Promise.all([
    ipHash
      ? admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo)
      : Promise.resolve({ count: 0 }),
    admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", dayAgo),
  ]);
  if ((byIp.count ?? 0) >= 3 || (byEmail.count ?? 0) >= 5)
    return { error: "You've sent several messages already. We'll reply soon; please wait before sending another." };

  const me = await getCurrentProfile();
  const { error } = await admin
    .from("contact_messages")
    .insert({ name, email, phone, topic, order_number: orderNumber, message, user_id: me?.id ?? null, ip_hash: ipHash });
  if (error) {
    console.error("contact message", error);
    return { error: "We couldn't send your message. Please email us instead." };
  }

  // A copy to the support inbox when email is set up (reply goes straight to the sender)
  const business = await getBusiness();
  const supportEmail = parseEmail(business.email);
  if (supportEmail && supportEmail !== "invalid") {
    const mail = contactEmail({
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      businessName: business.legal_name || "Eliphas Indicus Publications",
      name,
      email,
      phone,
      topic: `${CONTACT_TOPICS[topic as keyof typeof CONTACT_TOPICS]}${orderNumber ? ` (${orderNumber})` : ""}`,
      message,
    });
    await queueEmail({ kind: "contact_message", to: supportEmail, ...mail, replyTo: email, userId: me?.id ?? null });
  }
  revalidatePath("/admin/messages");
  return { ok: "Thanks. Your message is with our team; we reply within two working days." };
}

/** Admin: mark a message replied or closed, with an optional private note. */
export async function updateContactMessage(id: string, _: ContactState, fd: FormData): Promise<ContactState> {
  const me = await requireRole(["admin"]);
  const status = text(fd, "status");
  const note = text(fd, "admin_note").slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["new", "replied", "closed"].includes(status)) return { error: "Refresh and try again." };
  const { error } = await createAdminClient()
    .from("contact_messages")
    .update({ status, admin_note: note || null, handled_by: me.id, handled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Could not save." };
  await logAudit(me.id, "contact_message.updated", "contact_message", id, { status });
  revalidatePath("/admin/messages");
  return { ok: "Saved." };
}
