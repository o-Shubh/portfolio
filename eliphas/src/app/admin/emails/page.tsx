import type { Metadata } from "next";
import { retryAllEmailsAction, retryEmailAction } from "@/app/actions/emails";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { RetryButton } from "./RetryButtons";

export const metadata: Metadata = { title: "Emails" };

const KIND: Record<string, string> = {
  order_confirmed: "Order confirmed",
  order_shipped: "Order shipped",
  order_delivered: "Order delivered",
  order_cancelled: "Order cancelled",
  refund_processed: "Refund sent",
  contact_message: "Contact form",
};
const TONE: Record<string, string> = {
  sent: "bg-tint-success text-success",
  queued: "bg-tint-info text-accent-fg",
  failed: "bg-tint-danger text-danger",
  skipped: "bg-surface-3 text-muted",
};
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
// Show only the start of an address in the log
const mask = (e: string) => e.replace(/^(.{2}).*(@.*)$/, "$1…$2");

export default async function EmailsPage() {
  await requireRole(["admin"]);
  const { data, error } = await createAdminClient()
    .from("email_outbox")
    .select("id, kind, to_email, subject, status, attempts, last_error, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const failed = (data ?? []).filter((e) => e.status === "failed").length;

  return (
    <>
      <PageHeader
        title="Emails"
        intro="Order updates and contact messages the app sends. Each update is sent once. Failed emails are retried every day and you can retry them here."
        action={failed ? <RetryButton action={retryAllEmailsAction} label={`Retry ${failed} failed`} /> : undefined}
      />
      {!emailConfigured() && (
        <p className="notice-warn mb-6">
          Email isn&apos;t set up yet, so nothing is sent (emails are recorded as skipped). Add RESEND_API_KEY and EMAIL_FROM in Vercel to switch it on.
        </p>
      )}
      {error ? (
        <p role="alert" className="notice-danger">
          Couldn&apos;t load emails. Check that migration 000022 has been applied.
        </p>
      ) : !data?.length ? (
        <p className="card text-center text-muted">No emails yet.</p>
      ) : (
        <ul className="group-list">
          {data.map((e) => (
            <li key={e.id} className="space-y-1 px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{e.subject}</p>
                  <p className="text-sm text-muted">
                    {KIND[e.kind] ?? e.kind} · {mask(e.to_email)} · {when(e.created_at)}
                    {e.attempts > 1 ? ` · ${e.attempts} attempts` : ""}
                  </p>
                </div>
                <span className={`badge whitespace-nowrap ${TONE[e.status] ?? ""}`}>{e.status}</span>
              </div>
              {e.last_error && e.status !== "sent" && <p className="text-sm text-muted">{e.last_error}</p>}
              {e.status === "failed" && <RetryButton action={retryEmailAction.bind(null, e.id)} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
