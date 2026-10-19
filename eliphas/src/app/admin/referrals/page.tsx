import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { getReferralSettings } from "@/lib/referrals";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdjustCreditForm, ProcessRewardsButton, ReasonForm, ReferralSettingsForm } from "./ReferralForms";

export const metadata: Metadata = { title: "Referrals" };

const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const paise = (n: number | string | null) => Math.round(Number(n ?? 0) * 100);
const REASON: Record<string, string> = { friend_first_order: "first order", author_first_book: "first book" };

function istMonthStart() {
  const ist = new Date(Date.now() + 5.5 * 3_600_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3_600_000).toISOString();
}

export default async function ReferralsPage() {
  await requireRole(["admin"]);
  const settings = await getReferralSettings();
  const admin = createAdminClient();
  const [{ count: invites }, { data: rewards }, { data: monthOrders }, { data: refs, error }] = await Promise.all([
    admin.from("referrals").select("*", { count: "exact", head: true }),
    admin.from("referral_rewards").select("amount").eq("status", "granted"),
    admin
      .from("orders")
      .select("referral_discount, credit_used")
      .gte("paid_at", istMonthStart())
      .not("status", "in", "(pending_payment,cancelled)")
      .or("referral_discount.gt.0,credit_used.gt.0"),
    admin
      .from("referrals")
      .select(
        "id, referrer_id, created_at, status, blocked_reason, referrer_kind, inviter:profiles!referrals_referrer_id_fkey(full_name, phone), invited:profiles!referrals_referred_id_fkey(full_name, phone), referral_rewards(id, reason, amount, status, note, user_id)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const given = (rewards ?? []).reduce((a, r) => a + paise(r.amount), 0);
  const discounts = (monthOrders ?? []).reduce((a, o) => a + paise(o.referral_discount), 0);
  const creditUsed = (monthOrders ?? []).reduce((a, o) => a + paise(o.credit_used), 0);

  return (
    <>
      <PageHeader
        title="Referrals"
        intro="Invite links, first-order discounts and credit. Everything starts switched off; set the amounts and turn it on when you're ready."
        action={<ProcessRewardsButton />}
      />
      {error && (
        <p role="alert" className="notice-danger mb-6">
          Couldn&apos;t load referrals. Check that migration 000023 has been applied.
        </p>
      )}

      <dl className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Invited accounts", String(invites ?? 0)],
          ["Credit given (all time)", formatPaise(given)],
          ["Invite discounts this month", formatPaise(discounts)],
          ["Credit used this month", formatPaise(creditUsed)],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="display mt-1 text-2xl">{value}</dd>
          </div>
        ))}
      </dl>

      <ReferralSettingsForm settings={settings} />
      <p className="mt-3 text-sm text-muted">
        Readers see these amounts on the{" "}
        <Link href="/referral-terms" className="underline underline-offset-2">
          invite terms page
        </Link>
        . Have your lawyer and accountant check them before turning the programme on.
      </p>

      <div className="mt-8">
        <AdjustCreditForm />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl">Recent invites</h2>
        {!refs?.length ? (
          <p className="card text-center text-muted">No invites yet.</p>
        ) : (
          <ul className="space-y-3">
            {refs.map((r) => (
              <li key={r.id} className="card space-y-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p>
                    <span className="font-semibold">{r.invited?.full_name ?? "New account"}</span>
                    <span className="text-muted"> ({r.invited?.phone ?? "deleted"})</span> invited by{" "}
                    <span className="font-semibold">{r.inviter?.full_name ?? "a deleted account"}</span>
                    {r.inviter?.phone && <span className="text-muted"> ({r.inviter.phone})</span>}
                    <span className="text-muted">
                      {" "}
                      · {r.referrer_kind === "author" ? "author link" : "reader invite"} · joined {day(r.created_at)}
                    </span>
                  </p>
                  {r.status === "blocked" && <span className="badge bg-tint-danger text-danger">Blocked</span>}
                </div>
                {r.blocked_reason && <p className="text-muted">Blocked: {r.blocked_reason}</p>}
                {r.referral_rewards.length > 0 && (
                  <ul className="space-y-1.5 border-t border-line pt-2">
                    {r.referral_rewards.map((w) => (
                      <li key={w.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {w.status === "granted" ? formatPaise(paise(w.amount)) : "No reward"} to{" "}
                          {(w.user_id === r.referrer_id ? r.inviter?.full_name : r.invited?.full_name) ?? "a deleted account"} for{" "}
                          {REASON[w.reason] ?? w.reason}
                          {w.note && <span className="text-muted"> · {w.note}</span>}
                        </span>
                        {w.status === "granted" && <ReasonForm kind="cancel" id={w.id} />}
                      </li>
                    ))}
                  </ul>
                )}
                {r.status === "active" && <ReasonForm kind="block" id={r.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
