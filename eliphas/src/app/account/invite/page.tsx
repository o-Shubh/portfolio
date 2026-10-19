import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ShareButton } from "@/components/ShareButton";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { authorInviteRewardPaise, friendDiscountPaise, inviterRewardPaise, type ReferrerKind } from "@/lib/referral-rules";
import { creditBalance, ensureReferralCode, getReferralSettings } from "@/lib/referrals";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Invite friends", robots: { index: false } };

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const LEDGER_LABEL: Record<string, string> = {
  reward: "Invite reward",
  spend: "Used on an order",
  return: "Returned from a cancelled order",
  adjust: "Adjustment",
  clawback: "Reward taken back",
};

export default async function InvitePage() {
  const me = await requireRole(["reader", "author", "admin"]);
  const s = await getReferralSettings();
  const admin = createAdminClient();
  const [credit, { data: ledger }] = await Promise.all([
    creditBalance(me.id),
    admin
      .from("credit_ledger")
      .select("id, amount, kind, note, created_at, expires_at")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!s.enabled) {
    return (
      <>
        <PageHeader title="Invite friends" />
        <EmptyState icon={Gift} title="Invites aren't open right now" text="When the invite programme starts, your personal link will appear here." />
        {credit.balancePaise > 0 && <CreditCard credit={credit} />}
      </>
    );
  }

  const kind: ReferrerKind = me.role === "author" ? "author" : "reader";
  const code = await ensureReferralCode(me.id);
  const path = `/r/${code}`;
  const friendGets = friendDiscountPaise(s, kind, Number.MAX_SAFE_INTEGER);
  const youGet = inviterRewardPaise(s, kind);
  const bookReward = authorInviteRewardPaise(s);

  const [{ data: invited }, { data: books }] = await Promise.all([
    admin
      .from("referrals")
      .select(
        "id, referred_id, created_at, status, referred:profiles!referrals_referred_id_fkey(full_name), referral_rewards(user_id, reason, amount, status, note)",
      )
      .eq("referrer_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100),
    kind === "author"
      ? admin.from("books").select("id, title, slug").eq("author_id", me.id).eq("status", "published").order("published_at", { ascending: false })
      : { data: [] },
  ]);
  // Order progress of the people invited (status only; no order details are shown)
  const buyerIds = (invited ?? []).map((r) => r.referred_id);
  const { data: orders } = buyerIds.length
    ? await admin.from("orders").select("buyer_id, status, delivered_at").in("buyer_id", buyerIds).not("status", "in", "(pending_payment,cancelled)")
    : { data: [] };

  const message = [
    friendGets > 0
      ? `Join me on Eliphas Indicus and get ${formatPaise(friendGets)} off your first book.`
      : "Join me on Eliphas Indicus, where books are printed fresh for every reader.",
    `${site()}${path}`,
  ].join(" ");

  return (
    <>
      <PageHeader title="Invite friends" intro="Share your link. When the people you invite order or publish, you both benefit." />

      <section className="card space-y-4">
        <h2 className="text-lg">Your invite link</h2>
        <p className="mono overflow-x-auto rounded-[var(--radius-control)] bg-surface-2 px-3 py-2.5 text-sm whitespace-nowrap" data-testid="invite-link">
          {site()}
          {path}
        </p>
        <div className="flex flex-wrap gap-2">
          <ShareButton path={path} title="Eliphas Indicus" label="Share or copy link" className="btn-accent min-h-11 gap-2 px-4 text-sm" />
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-4 text-sm">
            Share on WhatsApp
          </a>
        </div>
        <ul className="grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
          {friendGets > 0 && (
            <li>
              <span className="block font-semibold">They get {formatPaise(friendGets)} off</span>
              <span className="text-muted">their first order{s.min_order > 0 && ` of ${formatPaise(s.min_order * 100)} or more`}.</span>
            </li>
          )}
          {youGet > 0 && (
            <li>
              <span className="block font-semibold">You get {formatPaise(youGet)} credit</span>
              <span className="text-muted">
                {s.reward_wait_days > 0 ? `${s.reward_wait_days} days after their first order is delivered.` : "when their first order is delivered."}
              </span>
            </li>
          )}
          {bookReward > 0 && (
            <li>
              <span className="block font-semibold">{formatPaise(bookReward)} each for a new author</span>
              <span className="text-muted">when someone you invite publishes their first book.</span>
            </li>
          )}
        </ul>
        <p className="text-xs text-muted">
          Credit is used as a discount on books at checkout and expires after {s.credit_expiry_days} days.
          {s.monthly_cap > 0 && ` You can earn up to ${formatPaise(s.monthly_cap * 100)} a month.`}{" "}
          <Link href="/referral-terms" className="underline underline-offset-2">
            Invite terms
          </Link>
        </p>
      </section>

      {(books ?? []).length > 0 && (
        <section className="card mt-6 space-y-3">
          <h2 className="text-lg">Share your books</h2>
          <p className="text-sm text-muted">These links open your book page. New customers who sign up through them count as your invites.</p>
          <ul className="divide-y divide-line">
            {(books ?? []).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0 font-medium">{b.title}</span>
                <ShareButton path={`${path}?b=${b.slug}`} title={b.title} label="Share book link" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CreditCard credit={credit} />

        <section className="card">
          <h2 className="text-lg">People you invited</h2>
          {(invited ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nobody yet. People appear here once they sign up with your link.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {(invited ?? []).map((r) => {
                const name = (r.referred?.full_name ?? "").trim().split(/\s+/)[0] || "Someone";
                const mine = r.referral_rewards.filter((w) => w.user_id === me.id);
                const theirOrders = (orders ?? []).filter((o) => o.buyer_id === r.referred_id);
                const delivered = theirOrders.find((o) => o.status === "delivered" && o.delivered_at);
                const granted = mine.filter((w) => w.status === "granted");
                const stopped = mine.find((w) => w.status === "cancelled" && w.reason === "friend_first_order");
                let status: string;
                if (granted.length) status = `You earned ${formatPaise(granted.reduce((a, w) => a + Math.round(Number(w.amount) * 100), 0))}`;
                else if (stopped) status = stopped.note ?? "No reward";
                else if (r.status === "blocked") status = "No reward";
                else if (delivered) status = "Order delivered: credit coming soon";
                else if (theirOrders.length) status = "Ordered";
                else status = "Joined";
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="font-medium">{name}</span>
                      <span className="block text-xs text-muted">Joined {day(r.created_at)}</span>
                    </span>
                    <span className="text-right text-muted">{status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {(ledger ?? []).length > 0 && (
        <section className="card mt-6">
          <h2 className="text-lg">Credit history</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(ledger ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-medium">{LEDGER_LABEL[l.kind] ?? l.kind}</span>
                  <span className="block text-xs text-muted">
                    {day(l.created_at)}
                    {l.note && l.kind === "adjust" && ` · ${l.note}`}
                    {l.expires_at && ` · expires ${day(l.expires_at)}`}
                  </span>
                </span>
                <span className={`mono ${Number(l.amount) > 0 ? "text-success" : ""}`}>
                  {Number(l.amount) > 0 ? "+" : "−"}
                  {formatPaise(Math.abs(Math.round(Number(l.amount) * 100)))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function CreditCard({ credit }: { credit: { balancePaise: number; nextExpiry: string | null; expiringPaise: number } }) {
  return (
    <section className="card">
      <h2 className="text-lg">Your credit</h2>
      <p className="display mt-2 text-[2rem]" data-testid="credit-balance">
        {formatPaise(Math.max(credit.balancePaise, 0))}
      </p>
      {credit.nextExpiry && credit.expiringPaise > 0 && (
        <p className="text-sm text-muted">
          {formatPaise(credit.expiringPaise)} expires on {day(credit.nextExpiry)}.
        </p>
      )}
      {credit.balancePaise < 0 && (
        <p className="text-sm text-muted">{formatPaise(-credit.balancePaise)} will come off your next credit (a reward was taken back after it was used).</p>
      )}
      <p className="mt-3 text-sm text-muted">
        Use it on books at checkout.{" "}
        <Link href="/books" className="font-semibold text-fg underline underline-offset-2">
          Browse books
        </Link>
      </p>
    </section>
  );
}
