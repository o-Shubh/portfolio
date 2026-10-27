import "server-only";
import { cache } from "react";
import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** One plan's limits and price. Prices are in paise before GST; null means "not on sale yet". */
export type StudioPlanLimits = { blueprints?: number; chapters?: number; monthly_chapters?: number; price_paise?: number | null; final_review?: boolean };

/** Writing Studio settings (settings row "studio", edited by an admin). */
export type StudioSettings = {
  open: boolean; // false: only admins can use the Studio (while it's being built and tested)
  usd_inr: number | null; // exchange rate for showing AI costs in rupees
  revision_limit: number; // revisions allowed per chapter
  plans: { free: StudioPlanLimits; writer: StudioPlanLimits; pro: StudioPlanLimits; pack: StudioPlanLimits };
};

const DEFAULTS: StudioSettings = {
  open: false,
  usd_inr: null,
  revision_limit: 5,
  plans: { free: { blueprints: 1, chapters: 1 }, writer: {}, pro: {}, pack: {} },
};

export const getStudioSettings = cache(async (): Promise<StudioSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "studio").maybeSingle();
  return { ...DEFAULTS, ...((data?.value as Partial<StudioSettings>) ?? {}) };
});

/** Can this person use the Studio? Everyone once it's open; until then admins only. */
export async function canUseStudio(profile: Pick<Profile, "role">): Promise<boolean> {
  return profile.role === "admin" || (await getStudioSettings()).open;
}
