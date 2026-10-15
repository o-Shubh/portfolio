import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreditForm, RefundForm } from "./SubForms";

export const metadata: Metadata = { title: "Subscriptions" };

const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—");

export default async function SubscriptionsPage() {
  await requireRole(["admin"]);
  const db = createAdminClient();
  const { data: periods } = await db
    .from("subscription_periods")
    .select("*, payments(amount_paise, refunded_paise, status, receipt_number, mode), profiles!subscription_periods_author_id_fkey(full_name), plan_versions(version)")
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);
  const { data: ledger } = await db.from("pro_credit_ledger").select("period_id, delta");
  const balance = new Map<string, number>();
  for (const l of ledger ?? []) balance.set(l.period_id, (balance.get(l.period_id) ?? 0) + l.delta);
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Pro subscriptions"
        intro="Prepaid monthly periods (no automatic renewal). Refund policy: a period that hasn't started is refunded in full; an active period is ended now with a refund you choose, and unused credits are voided. Books, earnings and requests already made are not affected."
      />
      {!periods?.length ? (
        <div className="card text-muted">No Pro subscriptions yet.</div>
      ) : (
        <ul className="space-y-3">
          {periods.map((p) => {
            const active = p.status === "paid" && new Date(p.starts_at!) <= now && new Date(p.ends_at!) > now;
            const notStarted = p.status === "paid" && new Date(p.starts_at!) > now;
            return (
              <li key={p.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.profiles?.full_name}</p>
                    <p className="text-sm text-muted">
                      {d(p.starts_at)} → {d(p.ends_at)} · Pro v{p.plan_versions?.version} · {p.payments ? formatPaise(p.payments.amount_paise) : ""}{" "}
                      {p.payments?.mode === "mock" && "(test)"} · receipt {p.payments?.receipt_number ?? "—"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {p.status === "refunded" ? "Refunded" : active ? "Active" : notStarted ? "Starts later" : p.status === "paid" ? "Ended" : p.status}
                    {p.status !== "refunded" && ` · credits ${balance.get(p.id) ?? 0}/${p.credits_granted}`}
                  </span>
                </div>
                {active && <CreditForm authorId={p.author_id} />}
                {(active || notStarted) && <RefundForm periodId={p.id} notStarted={notStarted} />}
                {p.refund_note && <p className="text-sm text-muted">Refund note: {p.refund_note}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
