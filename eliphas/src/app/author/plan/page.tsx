import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AcceptTerms } from "@/components/AcceptTerms";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise, withGst } from "@/lib/commission";
import { getCommissionTerms, getCurrentPlans, proStatus } from "@/lib/plans";
import { BuyProButton } from "./ProButtons";

export const metadata: Metadata = { title: "Plan" };

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—";

export default async function PlanPage() {
  const profile = await requireRole(["author", "admin"]);
  const [plans, status, terms] = await Promise.all([getCurrentPlans(), proStatus(profile.id), getCommissionTerms()]);
  const proPrice = withGst(plans.pro.price_paise, Number(plans.pro.gst_percent));
  const accepted = Boolean(profile.author_terms_accepted_at);
  const currentPlan = status.active ? "Pro" : accepted ? "Free" : "Original terms";

  return (
    <>
      <PageHeader title="Your plan" intro="Publishing is always free. Pro is optional and never needed to publish or sell." />

      <section className="card mb-6" aria-labelledby="current-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <h2 id="current-heading" className="mt-1 text-2xl">
              {currentPlan}
            </h2>
            {status.active ? (
              <p className="mt-1 text-sm text-muted">
                Paid access until <strong className="text-fg">{fmtDate(status.accessUntil)}</strong>
                {status.queued.length > 0 && ` (includes ${status.queued.length} renewal${status.queued.length > 1 ? "s" : ""} already paid)`}.
                Pro doesn&apos;t renew automatically, so there&apos;s nothing to cancel. After that date, new sales use Free rates.
              </p>
            ) : accepted ? (
              <p className="mt-1 text-sm text-muted">
                {Number(plans.free.commission_percent)}% commission per copy (minimum {formatPaise(plans.free.commission_min_paise)}) + GST. You accepted the
                author terms (version {profile.author_terms_version}) on {fmtDate(profile.author_terms_accepted_at)}. The current terms now apply to your new
                sales.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Your existing books stay on the terms you joined with ({formatPaise(plans.legacy.commission_min_paise)} per copy) until you accept the current
                terms. New books need the current terms.
              </p>
            )}
          </div>
          {status.active && (
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-center">
              <p className="text-3xl font-semibold tabular-nums">{status.credits}</p>
              <p className="text-xs text-muted">creative credits left this period</p>
            </div>
          )}
        </div>
        {status.active && (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
            <Link href="/author/creatives/new" className="btn-primary">
              Request a creative
            </Link>
            <Link href="/author/analytics" className="btn-ghost">
              Sales analytics
            </Link>
          </div>
        )}
      </section>

      {!accepted && (
        <section className="card mb-6">
          <AcceptTerms summary={terms.summary} version={terms.version} />
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="text-xl">Free</h2>
          <p className="mt-1 text-3xl font-semibold">₹0</p>
          <ul className="mt-4 space-y-2 text-sm">
            <Li ok>Publishing and bookstore listing</Li>
            <Li ok>Sales, earnings and payout dashboard</Li>
            <Li ok>Standard support</Li>
            <Li ok>
              {Number(plans.free.commission_percent)}% commission per copy, minimum {formatPaise(plans.free.commission_min_paise)}, plus GST
            </Li>
          </ul>
        </section>
        <section className="card ring-2 ring-accent/30">
          <h2 className="text-xl">Author Pro</h2>
          <p className="mt-1 text-3xl font-semibold">
            {formatPaise(proPrice.totalPaise)}
            <span className="ml-1 text-base font-normal text-muted">/ month</span>
          </p>
          <p className="text-xs text-muted">
            {formatPaise(plans.pro.price_paise)} + {Number(plans.pro.gst_percent)}% GST ({formatPaise(proPrice.gstPaise)}). Prepaid; renew manually.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <Li ok>Everything in Free</Li>
            <Li ok>
              {Number(plans.pro.commission_percent)}% commission per copy, minimum {formatPaise(plans.pro.commission_min_paise)}, plus GST
            </Li>
            <Li ok>Detailed sales analytics and campaign-link tracking</Li>
            <Li ok>{plans.pro.credits_per_period} template-based promotional creatives per paid month, one revision each</Li>
            <Li ok>Priority support</Li>
            <Li>Unused credits don&apos;t roll over</Li>
            <Li>Doesn&apos;t include cover design, editing, formatting, ad spend or guaranteed sales</Li>
          </ul>
          <div className="mt-5">
            {accepted ? (
              <BuyProButton label={status.active ? `Renew for 1 more month · ${formatPaise(proPrice.totalPaise)}` : `Get Pro · ${formatPaise(proPrice.totalPaise)}`} />
            ) : (
              <p className="text-sm text-muted">Accept the author terms above to get Pro.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            A renewal starts when your current paid month ends, so no days are lost. Pro starts only after the payment is confirmed. Refunds follow our{" "}
            <Link href="/refunds" className="underline">
              refund policy
            </Link>
            .
          </p>
        </section>
      </div>

      <p className="mt-6 text-sm text-muted">
        <Link href="/author/payments" className="font-medium text-fg underline">
          Payment history and receipts
        </Link>{" "}
        ·{" "}
        <Link href="/pricing" className="underline">
          Compare earnings
        </Link>
      </p>
    </>
  );
}

function Li({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />}
      <span className={ok ? "" : "text-muted"}>{children}</span>
    </li>
  );
}
