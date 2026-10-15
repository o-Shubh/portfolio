import "server-only";
import { cache } from "react";
import { ruleFromPlanVersion, type CommissionRule } from "@/lib/commission";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlanVersion = Database["public"]["Tables"]["plan_versions"]["Row"];
export type SubscriptionPeriod = Database["public"]["Tables"]["subscription_periods"]["Row"];

export type TaxSettings = {
  platform_gst_percent: number;
  gst_registered: boolean;
  withholding_configured: boolean;
  review_note?: string;
};
export type CommissionTerms = { version: string; effective_from: string; summary: string };

/** The plan versions in force now (latest effective version of each plan). */
export const getCurrentPlans = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_versions")
    .select("*")
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false })
    .order("version", { ascending: false });
  const pick = (plan: string) => (data ?? []).find((p) => p.plan === plan) ?? null;
  const free = pick("free");
  const pro = pick("pro");
  const legacy = pick("legacy");
  if (!free || !pro || !legacy) throw new Error("Plan versions missing. Run the database migrations.");
  return { free, pro, legacy };
});

export const getTaxSettings = cache(async (): Promise<TaxSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "tax").maybeSingle();
  return { platform_gst_percent: 18, gst_registered: false, withholding_configured: false, ...((data?.value as object) ?? {}) } as TaxSettings;
});

export const getCommissionTerms = cache(async (): Promise<CommissionTerms> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "commission_terms").maybeSingle();
  return (data?.value as unknown as CommissionTerms) ?? { version: "2026-11", effective_from: "2026-11-01", summary: "" };
});

/** The commission rule that applies to an author's sale right now (server-side source of truth). */
export async function authorRule(authorId: string, at = new Date()): Promise<{ rule: CommissionRule; version: PlanVersion }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("author_commission_rule", { p_author: authorId, p_at: at.toISOString() });
  if (error || !data) throw new Error(`Could not load commission rule: ${error?.message ?? "missing"}`);
  const pv = (Array.isArray(data) ? data[0] : data) as PlanVersion;
  return { rule: ruleFromPlanVersion(pv), version: pv };
}

/** The author's Pro status: current paid period, any queued renewal, and credits left this period. */
export async function proStatus(authorId: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: periods } = await admin
    .from("subscription_periods")
    .select("*")
    .eq("author_id", authorId)
    .eq("status", "paid")
    .gt("ends_at", now)
    .order("starts_at");
  const current = (periods ?? []).find((p) => p.starts_at! <= now) ?? null;
  const queued = (periods ?? []).filter((p) => p.starts_at! > now);
  let credits = 0;
  if (current) {
    const { data } = await admin.rpc("period_credit_balance", { p_period: current.id });
    credits = Number(data ?? 0);
  }
  const accessUntil = periods?.length ? periods[periods.length - 1].ends_at : null;
  return { active: Boolean(current), current, queued, credits, accessUntil };
}

export async function logAudit(actorId: string | null, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({ actor_id: actorId, action, entity, entity_id: entityId, details: details as never });
}

/**
 * New books need the current author terms. Books that were already published before keep the
 * author's original terms, so their sales are never moved to new terms without consent.
 */
export function termsRequirement(
  book: { published_at: string | null },
  profile: { author_terms_accepted_at: string | null },
) {
  return { required: !profile.author_terms_accepted_at && !book.published_at, accepted: Boolean(profile.author_terms_accepted_at) };
}
