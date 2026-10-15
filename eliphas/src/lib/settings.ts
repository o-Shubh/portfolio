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

/** Company details for the Contact and policy pages. Edited by an admin in Settings. */
export type Business = {
  legal_name: string;
  address: string;
  email: string;
  phone: string;
  gstin: string;
  grievance_officer: string;
  jurisdiction_city: string;
  support_hours: string;
};

export const BUSINESS_FIELDS: { key: keyof Business; label: string; hint?: string; required?: boolean; multiline?: boolean }[] = [
  { key: "legal_name", label: "Legal business name", hint: "As registered, e.g. “Eliphas Indicus Publications” or your company name", required: true },
  { key: "address", label: "Registered address", hint: "Full postal address. Razorpay checks this.", required: true, multiline: true },
  { key: "email", label: "Support email", required: true },
  { key: "phone", label: "Support phone", required: true },
  { key: "support_hours", label: "Support hours" },
  { key: "grievance_officer", label: "Grievance officer name", hint: "Required by Indian IT rules. Can be you." },
  { key: "jurisdiction_city", label: "City for legal jurisdiction", hint: "e.g. Pune" },
  { key: "gstin", label: "GSTIN", hint: "Optional until you register for GST" },
];

export const getBusiness = cache(async (): Promise<Business> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "business").maybeSingle();
  const v = (data?.value ?? {}) as Partial<Business>;
  return Object.fromEntries(BUSINESS_FIELDS.map((f) => [f.key, String(v[f.key] ?? "").trim()])) as Business;
});

/** Required details that are still empty (shown as a warning to admins). */
export const missingBusiness = (b: Business) => BUSINESS_FIELDS.filter((f) => f.required && !b[f.key]).map((f) => f.label);
