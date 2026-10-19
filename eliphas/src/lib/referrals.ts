import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  addressKey,
  authorInviteRewardPaise,
  friendDiscountPaise,
  inviterRewardPaise,
  isNewAccount,
  isReferralCode,
  looksLikeInviter,
  newReferralCode,
  parseReferralSettings,
  usableCreditPaise,
  type ReferralSettings,
  type ReferrerKind,
} from "@/lib/referral-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** First-party cookie remembering whose invite link was opened (30 days). Holds only the invite code. */
export const REFERRAL_COOKIE = "eip_ref";
export const REFERRAL_DAYS = 30;

export const getReferralSettings = cache(async (): Promise<ReferralSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "referrals").maybeSingle();
  return parseReferralSettings(data?.value);
});

/** The person's invite code, created the first time it's needed. */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (data) return data.code;
  for (let i = 0; i < 5; i++) {
    const code = newReferralCode();
    const { error } = await admin.from("referral_codes").insert({ user_id: userId, code });
    if (!error) return code;
    // Someone else created this person's code at the same moment
    const { data: again } = await admin.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (again) return again.code;
  }
  return null;
}

/** Who an invite code belongs to (first name only, for the welcome page). */
export async function inviterForCode(code: string) {
  if (!isReferralCode(code)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("referral_codes").select("user_id, profiles(full_name, role)").eq("code", code).maybeSingle();
  if (!data?.profiles) return null;
  return { userId: data.user_id, firstName: (data.profiles.full_name ?? "").trim().split(/\s+/)[0] || null, kind: kindOf(data.profiles.role) };
}

const kindOf = (role: string): ReferrerKind => (role === "author" ? "author" : "reader");

/**
 * Links a brand-new account to the invite link it came from. Called once, when the account finishes setting up.
 * Ignored while the programme is off, for accounts older than a day, accounts that already ordered, and your own link.
 */
export async function attachReferral(profile: { id: string; created_at: string }) {
  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value ?? "";
  if (!code) return;
  jar.delete(REFERRAL_COOKIE);
  try {
    if (!isNewAccount(profile.created_at) || !(await getReferralSettings()).enabled) return;
    const inviter = await inviterForCode(code);
    if (!inviter || inviter.userId === profile.id) return;
    const admin = createAdminClient();
    const { count } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", profile.id).neq("status", "pending_payment");
    if (count) return;
    // referred_id is unique: a second attempt does nothing
    await admin.from("referrals").insert({ referrer_id: inviter.userId, referred_id: profile.id, code, referrer_kind: inviter.kind });
  } catch (e) {
    console.error("attachReferral", e);
  }
}

/** Current credit (paise; negative when credit was taken back after being spent) and the next expiry. */
export async function creditBalance(userId: string) {
  const { data: raw } = await createAdminClient().rpc("credit_balance", { p_user: userId });
  const data = raw as { balance: number | string; next_expiry: string | null; expiring: number | string } | null;
  return {
    balancePaise: Math.round(Number(data?.balance ?? 0) * 100),
    nextExpiry: data?.next_expiry ?? null,
    expiringPaise: Math.round(Number(data?.expiring ?? 0) * 100),
  };
}

export type CheckoutBenefits = {
  referral: { id: string; discountPaise: number } | null;
  creditBalancePaise: number;
  creditUsablePaise: number;
};

/**
 * Invite discount (first order of an invited account) and how much credit this order could use.
 * `booksPaise` is the full books value before any discount.
 */
export async function checkoutBenefits(userId: string, booksPaise: number): Promise<CheckoutBenefits> {
  const s = await getReferralSettings();
  const admin = createAdminClient();
  let referral: CheckoutBenefits["referral"] = null;
  if (s.enabled) {
    const { data: ref } = await admin.from("referrals").select("id, referrer_id, referrer_kind, status").eq("referred_id", userId).maybeSingle();
    if (ref && ref.status === "active" && ref.referrer_id) {
      // First order only: nothing bought before (unpaid and cancelled orders don't count)
      const { count } = await admin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", userId)
        .not("status", "in", "(pending_payment,cancelled)");
      const discountPaise = count ? 0 : friendDiscountPaise(s, ref.referrer_kind as ReferrerKind, booksPaise);
      if (discountPaise > 0) referral = { id: ref.id, discountPaise };
    }
  }
  const { balancePaise } = await creditBalance(userId);
  // Credit already earned stays usable while the programme is switched off
  const creditUsablePaise = usableCreditPaise(balancePaise, booksPaise - (referral?.discountPaise ?? 0), s.max_credit_percent);
  return { referral, creditBalancePaise: balancePaise, creditUsablePaise };
}

/**
 * Cancels the buyer's unpaid checkouts that hold credit or the first-order discount, so the credit can be used again
 * (the database gives it back) and the discount can't be used on two orders at once. A payment that still arrives for
 * one of them is refunded automatically.
 */
export async function releaseHeldCredit(filter: { buyerId?: string; olderThanHours?: number }) {
  const admin = createAdminClient();
  let q = admin
    .from("orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Checkout not completed" })
    .eq("status", "pending_payment")
    .or("credit_used.gt.0,referral_discount.gt.0");
  if (filter.buyerId) q = q.eq("buyer_id", filter.buyerId);
  if (filter.olderThanHours) q = q.lt("created_at", new Date(Date.now() - filter.olderThanHours * 3600_000).toISOString());
  const { data } = await q.select("id");
  return data?.length ?? 0;
}

/**
 * Gives the rewards that are due. Run daily (and from Admin → Referrals). Safe to run again: each reward is given once.
 *  - Inviter: when the invited friend's first order has been delivered for `reward_wait_days` and wasn't refunded.
 *  - Author invite: when the invited person's first book is published, both sides.
 */
export async function processReferralRewards() {
  const s = await getReferralSettings();
  const admin = createAdminClient();
  const result = { granted: 0, capped: 0, blocked: 0 };
  if (!s.enabled) return result;
  const record = (r: string | null) => {
    if (r === "granted") result.granted++;
    else if (r === "capped") result.capped++;
  };

  const { data: refs } = await admin
    .from("referrals")
    .select("id, referrer_id, referred_id, referrer_kind, referral_rewards(user_id, reason)")
    .eq("status", "active")
    .not("referrer_id", "is", null)
    .order("created_at")
    .limit(1000);

  const cutoff = new Date(Date.now() - s.reward_wait_days * 86400_000).toISOString();
  for (const ref of refs ?? []) {
    const inviterId = ref.referrer_id!;
    const has = (user: string, reason: string) => ref.referral_rewards.some((r) => r.user_id === user && r.reason === reason);

    // 1. Friend's first order
    const amount = inviterRewardPaise(s, ref.referrer_kind as ReferrerKind);
    if (amount > 0 && !has(inviterId, "friend_first_order")) {
      const { data: order } = await admin
        .from("orders")
        .select("id, ship_phone, ship_line1, ship_pincode, subtotal")
        .eq("buyer_id", ref.referred_id)
        .eq("status", "delivered")
        .is("refund_status", null)
        .lte("delivered_at", cutoff)
        .gte("subtotal", s.min_order)
        .order("delivered_at")
        .limit(1)
        .maybeSingle();
      if (order) {
        const [{ data: inviter }, { data: own }] = await Promise.all([
          admin.from("profiles").select("phone").eq("id", inviterId).maybeSingle(),
          admin.from("orders").select("ship_line1, ship_pincode").eq("buyer_id", inviterId).limit(50),
        ]);
        const addresses = (own ?? []).map((o) => addressKey(o.ship_line1, o.ship_pincode));
        if (looksLikeInviter(order, { phone: inviter?.phone ?? null, addresses })) {
          await admin.from("referral_rewards").insert({
            referral_id: ref.id,
            user_id: inviterId,
            reason: "friend_first_order",
            order_id: order.id,
            amount: 0,
            status: "cancelled",
            note: "Delivered to the inviter's own phone or address",
            cancelled_at: new Date().toISOString(),
          });
          result.blocked++;
        } else {
          const { data: r } = await admin.rpc("grant_referral_reward", {
            p_referral: ref.id,
            p_user: inviterId,
            p_reason: "friend_first_order",
            p_order: order.id,
            p_amount: amount / 100,
            p_cap: s.monthly_cap,
            p_expiry_days: s.credit_expiry_days,
          });
          record(r);
        }
      }
    }

    // 2. Invited person publishes their first book
    const bookReward = authorInviteRewardPaise(s);
    if (bookReward > 0 && (!has(inviterId, "author_first_book") || !has(ref.referred_id, "author_first_book"))) {
      const { data: book } = await admin
        .from("books")
        .select("id")
        .eq("author_id", ref.referred_id)
        .eq("status", "published")
        .order("published_at")
        .limit(1)
        .maybeSingle();
      if (book) {
        for (const user of [inviterId, ref.referred_id]) {
          if (has(user, "author_first_book")) continue;
          const { data: r } = await admin.rpc("grant_referral_reward", {
            p_referral: ref.id,
            p_user: user,
            p_reason: "author_first_book",
            p_book: book.id,
            p_amount: bookReward / 100,
            p_cap: s.monthly_cap,
            p_expiry_days: s.credit_expiry_days,
          });
          record(r);
        }
      }
    }
  }
  return result;
}

/** The invite this browser came with (from the invite link cookie), while the programme is on. */
export async function pendingInvite() {
  const code = (await cookies()).get(REFERRAL_COOKIE)?.value ?? "";
  const s = await getReferralSettings();
  if (!code || !s.enabled) return null;
  const inviter = await inviterForCode(code);
  if (!inviter) return null;
  return { firstName: inviter.firstName, discountPaise: friendDiscountPaise(s, inviter.kind, Number.MAX_SAFE_INTEGER), minOrderPaise: s.min_order * 100 };
}
