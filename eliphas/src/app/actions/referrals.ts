"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { cleanIndianMobile } from "@/lib/phone";
import { logAudit } from "@/lib/plans";
import { parseReferralSettings, REFERRAL_LIMITS, REFERRAL_SWITCHES, validateReferralSettings } from "@/lib/referral-rules";
import { getReferralSettings, processReferralRewards } from "@/lib/referrals";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ReferralActionState = { error?: string; ok?: string } | undefined;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Programme switches and amounts (Admin → Referrals). */
export async function saveReferralSettings(_prev: ReferralActionState, fd: FormData): Promise<ReferralActionState> {
  const profile = await requireRole(["admin"]);
  const raw: Record<string, unknown> = {};
  for (const k of Object.keys(REFERRAL_LIMITS)) raw[k] = text(fd, k);
  const errors = validateReferralSettings(raw);
  if (errors.length) return { error: errors.slice(0, 3).join(" ") };
  for (const k of REFERRAL_SWITCHES) raw[k] = fd.get(k) === "on";
  const value = parseReferralSettings(raw);
  if (value.enabled && !value.reader_enabled && !value.author_enabled && !value.author_author_enabled) {
    return { error: "Turn on at least one of the three invite types, or switch the programme off." };
  }
  const before = await getReferralSettings();
  const { error } = await (
    await createClient()
  )
    .from("settings")
    .update({ value: value as unknown as NonNullable<Json>, updated_by: profile.id })
    .eq("key", "referrals");
  if (error) return { error: "Could not save. Check that migration 000023 has been applied." };
  await logAudit(profile.id, "referrals.settings", "settings", null, { before, after: value });
  revalidatePath("/", "layout");
  return { ok: value.enabled ? "Saved. The invite programme is on." : "Saved. The invite programme is off." };
}

/** Gives the rewards that are due now (the daily job does the same). */
export async function runReferralRewards(): Promise<ReferralActionState> {
  const profile = await requireRole(["admin"]);
  const r = await processReferralRewards();
  await logAudit(profile.id, "referrals.process", "referrals", null, r);
  revalidatePath("/admin/referrals");
  const parts = [`${r.granted} given`, r.capped ? `${r.capped} over the monthly limit` : "", r.blocked ? `${r.blocked} not eligible` : ""].filter(Boolean);
  return { ok: `Rewards checked: ${parts.join(", ")}.` };
}

/** Stops an invite from earning anything more (e.g. a suspected fake account). */
export async function blockReferral(referralId: string, _prev: ReferralActionState, fd: FormData): Promise<ReferralActionState> {
  const profile = await requireRole(["admin"]);
  const reason = text(fd, "reason").slice(0, 300);
  if (reason.length < 3) return { error: "Add a short reason." };
  const { data, error } = await createAdminClient()
    .from("referrals")
    .update({ status: "blocked", blocked_reason: reason })
    .eq("id", referralId)
    .eq("status", "active")
    .select("id");
  if (error || !data?.length) return { error: "This invite is already blocked." };
  await logAudit(profile.id, "referrals.block", "referral", referralId, { reason });
  revalidatePath("/admin/referrals");
  return { ok: "Blocked. No further discount or rewards for this invite." };
}

/** Takes back a reward that was given (its credit is removed). */
export async function cancelReward(rewardId: string, _prev: ReferralActionState, fd: FormData): Promise<ReferralActionState> {
  const profile = await requireRole(["admin"]);
  const reason = text(fd, "reason").slice(0, 300);
  if (reason.length < 3) return { error: "Add a short reason." };
  const { data, error } = await createAdminClient().rpc("cancel_referral_reward", { p_reward: rewardId, p_actor: profile.id, p_note: reason });
  if (error || !data) return { error: "This reward was already cancelled." };
  await logAudit(profile.id, "referrals.cancel_reward", "referral_reward", rewardId, { reason });
  revalidatePath("/admin/referrals");
  return { ok: "Reward cancelled and its credit removed." };
}

/** Adds or removes credit for one person, found by phone number. */
export async function adjustCredit(_prev: ReferralActionState, fd: FormData): Promise<ReferralActionState> {
  const profile = await requireRole(["admin"]);
  const mobile = cleanIndianMobile(text(fd, "phone"));
  const amount = Number(text(fd, "amount"));
  const note = text(fd, "note").slice(0, 300);
  if (!mobile) return { error: "Enter the person's 10-digit mobile number." };
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 10000) return { error: "Enter a whole amount from -10000 to 10000 (not 0)." };
  if (note.length < 3) return { error: "Add a short note saying why." };
  const admin = createAdminClient();
  const { data: person } = await admin.from("profiles").select("id, full_name").eq("phone", `91${mobile}`).maybeSingle();
  if (!person) return { error: "No account has this phone number." };
  const s = await getReferralSettings();
  const { error } = await admin.rpc("adjust_credit", {
    p_user: person.id,
    p_amount: amount,
    p_note: note,
    p_actor: profile.id,
    p_expiry_days: s.credit_expiry_days,
  });
  if (error) return { error: "Could not adjust the credit." };
  await logAudit(profile.id, "referrals.adjust_credit", "profile", person.id, { amount, note });
  revalidatePath("/admin/referrals");
  return { ok: `${amount > 0 ? "Added" : "Removed"} ₹${Math.abs(amount)} ${amount > 0 ? "to" : "from"} ${person.full_name ?? "this account"}'s credit.` };
}
