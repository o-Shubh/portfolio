import "server-only";
import { cache } from "react";
import type { Fees, PricingSettings, PrintRates, Shipping } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

/** Reads print rates, fees and shipping from the settings table (once per request). */
export const getPricingSettings = cache(async (): Promise<PricingSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["print_rates", "fees", "shipping"]);
  if (error) throw new Error(`Could not load settings: ${error.message}`);

  const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  if (!byKey.print_rates || !byKey.fees || !byKey.shipping) {
    throw new Error("Settings rows print_rates, fees and shipping must exist. Run the database migrations.");
  }
  return {
    rates: byKey.print_rates as unknown as PrintRates,
    fees: byKey.fees as unknown as Fees,
    shipping: byKey.shipping as unknown as Shipping,
  };
});
