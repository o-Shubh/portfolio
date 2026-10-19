import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email delivery through Resend (resend.com). Every email is first written to email_outbox, so each update is sent
 * once (dedupe_key), failures are retried and admins can see what went out (Admin → Emails).
 *
 * Needs RESEND_API_KEY and EMAIL_FROM (e.g. "Eliphas <orders@your-domain.in>", a domain verified in Resend).
 * Without them nothing is sent: emails are recorded as "skipped". Email never blocks an order or payment.
 */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

type Kind = "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled" | "refund_processed" | "contact_message" | "weekly_digest";

export async function queueEmail(input: {
  kind: Kind;
  to: string;
  subject: string;
  html: string;
  text: string;
  dedupeKey?: string;
  userId?: string | null;
  orderId?: string | null;
  replyTo?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("email_outbox")
      .upsert(
        {
          kind: input.kind,
          to_email: input.to,
          subject: input.subject.slice(0, 200),
          html: input.html,
          text_body: input.text,
          dedupe_key: input.dedupeKey ?? null,
          user_id: input.userId ?? null,
          order_id: input.orderId ?? null,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      )
      .select("id");
    if (error) return console.error("queueEmail", error);
    const id = data?.[0]?.id;
    if (id) await deliver(id, input.replyTo); // nothing returned = already queued before (duplicate)
  } catch (e) {
    console.error("queueEmail", e);
  }
}

/** Sends one outbox email now. Safe to call again: only queued or failed emails are sent. */
export async function deliver(id: string, replyTo?: string): Promise<"sent" | "failed" | "skipped" | "none"> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("email_outbox").select("*").eq("id", id).in("status", ["queued", "failed"]).maybeSingle();
  if (!row) return "none";
  if (!emailConfigured()) {
    await admin.from("email_outbox").update({ status: "skipped", last_error: "Email isn't set up (RESEND_API_KEY, EMAIL_FROM)." }).eq("id", id);
    return "skipped";
  }
  try {
    // RESEND_API_URL only for tests (a local stand-in); production always uses Resend's address
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": row.id, // a retry after a timeout can't send twice
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [row.to_email],
        subject: row.subject,
        html: row.html,
        text: row.text_body,
        ...(replyTo ? { reply_to: replyTo } : process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as { id?: string };
    await admin
      .from("email_outbox")
      .update({ status: "sent", sent_at: new Date().toISOString(), provider_id: body.id ?? null, attempts: row.attempts + 1, last_error: null })
      .eq("id", id);
    return "sent";
  } catch (e) {
    await admin
      .from("email_outbox")
      .update({ status: "failed", attempts: row.attempts + 1, last_error: (e instanceof Error ? e.message : String(e)).slice(0, 1000) })
      .eq("id", id);
    return "failed";
  }
}

/** Retries emails that failed (up to 5 attempts) or never got a send attempt. Used by the daily job and Admin → Emails. */
export async function retryEmails(limit = 50) {
  const admin = createAdminClient();
  const stale = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await admin
    .from("email_outbox")
    .select("id")
    .or(`status.eq.failed,and(status.eq.queued,created_at.lt.${stale})`)
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(limit);
  const results = { sent: 0, failed: 0, skipped: 0 };
  for (const r of data ?? []) {
    const out = await deliver(r.id);
    if (out !== "none") results[out]++;
  }
  return results;
}
