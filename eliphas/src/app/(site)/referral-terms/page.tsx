import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { formatPaise } from "@/lib/commission";
import { authorInviteRewardPaise, friendDiscountPaise, inviterRewardPaise } from "@/lib/referral-rules";
import { getReferralSettings } from "@/lib/referrals";

export const metadata: Metadata = { title: "Invite programme terms", description: "How invite links, first-order discounts and credit work." };

const money = (paise: number) => (paise > 0 ? formatPaise(paise) : "not offered at the moment");

export default async function ReferralTermsPage() {
  const s = await getReferralSettings();
  return (
    <LegalPage title="Invite programme terms" updated="29 October 2026" path="/referral-terms">
      {!s.enabled && (
        <p>
          <strong>The invite programme is not running at the moment.</strong> These terms apply when it is.
        </p>
      )}
      <p>
        Members can share a personal invite link. When someone new signs up through it, they may get a discount on their first order, and the person who invited
        them may earn credit. The amounts in force right now are shown below; we may change or end the programme at any time, and changes apply to rewards not
        yet given.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>
          <strong>Invited by a reader:</strong> the new member&apos;s first-order discount is {money(friendDiscountPaise(s, "reader", Number.MAX_SAFE_INTEGER))}
          ; the reader who invited them earns {money(inviterRewardPaise(s, "reader"))} in credit.
        </li>
        <li>
          <strong>Invited through an author&apos;s link:</strong> the new customer&apos;s first-order discount is{" "}
          {money(friendDiscountPaise(s, "author", Number.MAX_SAFE_INTEGER))}; the author earns {money(inviterRewardPaise(s, "author"))} in credit, in addition
          to their usual royalty.
        </li>
        <li>
          <strong>A new author:</strong> when someone you invited publishes their first book, you each earn {money(authorInviteRewardPaise(s))} in credit.
        </li>
        {s.min_order > 0 && <li>The first-order discount and reward need books worth at least {formatPaise(s.min_order * 100)} (before shipping).</li>}
      </ul>

      <h2>When rewards are given</h2>
      <ul>
        <li>Invites count only for new accounts that sign up within 30 days of opening the link, on the same device and browser.</li>
        <li>
          Credit for a friend&apos;s first order is added{" "}
          {s.reward_wait_days > 0 ? `${s.reward_wait_days} days after it is delivered` : "after it is delivered"}, so that orders that are cancelled or refunded
          don&apos;t count. If the order is refunded later, the credit is taken back.
        </li>
        <li>Orders delivered to the inviter&apos;s own phone number or address don&apos;t earn a reward. You can&apos;t invite yourself.</li>
        {s.monthly_cap > 0 && <li>One person can earn up to {formatPaise(s.monthly_cap * 100)} in credit per calendar month.</li>}
        <li>We may cancel rewards and credit obtained through fake accounts or misuse of the programme.</li>
      </ul>

      <h2>Using credit</h2>
      <ul>
        <li>Credit is a discount on books at checkout. It has no cash value and can&apos;t be transferred, withdrawn or exchanged for money.</li>
        <li>
          It can pay up to {s.max_credit_percent}% of the books in an order (not shipping). The oldest credit is used first, and credit expires{" "}
          {s.credit_expiry_days} days after it is added.
        </li>
        <li>If an order paid partly with credit is cancelled or refunded, the credit comes back to your account.</li>
        <li>Discounts and credit are paid by Eliphas Indicus. They never reduce what authors earn from their books.</li>
      </ul>

      <p>
        Questions? <Link href="/contact">Contact us</Link>. See also our <Link href="/terms">terms of use</Link>.
      </p>
    </LegalPage>
  );
}
