// Money maths for print cost and author earnings.
// Pure functions (no database calls) so the same code runs on the server and in
// the browser, e.g. in the live earnings calculator.
//
// The numbers come from the `settings` table (see supabase/migrations/*_settings_defaults.sql).

export type Option = { label: string };
export type PrintRates = {
  is_sample?: boolean;
  min_pages: number;
  max_pages: number;
  trim_sizes: Record<string, Option & { page_multiplier: number; width_in?: number; height_in?: number }>;
  interior: Record<string, Option & { per_page: number }>;
  paper: Record<string, Option & { per_page_extra: number; spine_mm_per_page?: number }>;
  binding: Record<string, Option & { base: number }>;
  cover_finish: Record<string, Option & { extra: number }>;
  /** Extra margin around the full print cover, in inches */
  cover_bleed_in?: number;
};
export type Fees = { platform_fee_per_copy: number; gateway_percent: number; gateway_gst_percent: number };
export type Shipping = { flat: number; free_above: number };
export type PricingSettings = { rates: PrintRates; fees: Fees; shipping: Shipping };

export type PrintOptions = {
  page_count: number;
  trim_size: string;
  binding: string;
  interior: string;
  paper: string;
  cover_finish: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Cost to print one copy, rounded up to the next rupee. Null if an option is unknown. */
export function printCost(o: PrintOptions, rates: PrintRates): number | null {
  const trim = rates.trim_sizes[o.trim_size];
  const interior = rates.interior[o.interior];
  const paper = rates.paper[o.paper];
  const binding = rates.binding[o.binding];
  const finish = rates.cover_finish[o.cover_finish];
  if (!trim || !interior || !paper || !binding || !finish) return null;
  if (!Number.isFinite(o.page_count) || o.page_count <= 0) return null;

  const pages = o.page_count * (interior.per_page + paper.per_page_extra) * trim.page_multiplier;
  return Math.ceil(binding.base + finish.extra + pages);
}

/** Razorpay charges on one copy: gateway % of MRP plus GST on that charge. */
export function paymentFee(mrp: number, fees: Fees): number {
  return round2(mrp * (fees.gateway_percent / 100) * (1 + fees.gateway_gst_percent / 100));
}

export type Earnings = {
  mrp: number;
  printCost: number;
  platformFee: number;
  paymentFee: number;
  /** What the author gets per copy. Can be negative if MRP is too low. */
  authorEarning: number;
};

/** Author earning per copy = MRP − print cost − platform fee − payment charges. */
export function earnings(mrp: number, cost: number, fees: Fees): Earnings {
  const pf = fees.platform_fee_per_copy;
  const gw = paymentFee(mrp, fees);
  return { mrp, printCost: cost, platformFee: pf, paymentFee: gw, authorEarning: round2(mrp - cost - pf - gw) };
}

/** Lowest whole-rupee MRP at which the author earns at least `minEarning` per copy. */
export function minimumMrp(cost: number, fees: Fees, minEarning = 0): number {
  const keep = 1 - (fees.gateway_percent / 100) * (1 + fees.gateway_gst_percent / 100);
  let mrp = Math.ceil((cost + fees.platform_fee_per_copy + minEarning) / keep);
  while (earnings(mrp, cost, fees).authorEarning < minEarning) mrp++;
  return mrp;
}

export function shippingFor(subtotal: number, s: Shipping): number {
  return subtotal >= s.free_above ? 0 : s.flat;
}

/** ₹1,234 or ₹1,234.50 in Indian number format. */
export function rupees(n: number): string {
  const whole = Number.isInteger(n);
  return (
    "₹" +
    n.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })
  );
}

/**
 * Options in a sensible display order: sizes small to large, everything else
 * cheapest first. (The database doesn't keep the order they were typed in.)
 */
export function sortedOptions<T extends Option>(group: Record<string, T>): [string, T][] {
  const rank = (o: Option) => {
    const x = o as Option & Partial<{ width_in: number; page_multiplier: number; base: number; per_page: number; per_page_extra: number; extra: number }>;
    return x.width_in ?? x.page_multiplier ?? x.base ?? x.per_page ?? x.per_page_extra ?? x.extra ?? 0;
  };
  return Object.entries(group).sort(([ka, a], [kb, b]) => rank(a) - rank(b) || ka.localeCompare(kb));
}

/** Numeric fields each option group must have (used to check edits to settings). */
export const RATE_FIELDS = {
  trim_sizes: ["page_multiplier", "width_in", "height_in"],
  interior: ["per_page"],
  paper: ["per_page_extra", "spine_mm_per_page"],
  binding: ["base"],
  cover_finish: ["extra"],
} as const;
export type RateGroup = keyof typeof RATE_FIELDS;

/** Returns a list of problems with a set of print rates (empty list = OK). */
export function validateRates(r: unknown): string[] {
  const errors: string[] = [];
  if (!r || typeof r !== "object") return ["Print rates must be an object."];
  const rates = r as Record<string, unknown>;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

  if (!Number.isInteger(rates.min_pages) || (rates.min_pages as number) < 1) errors.push("min_pages must be a whole number above 0.");
  if (!Number.isInteger(rates.max_pages) || (rates.max_pages as number) <= (rates.min_pages as number))
    errors.push("max_pages must be a whole number above min_pages.");
  if (rates.cover_bleed_in !== undefined && !num(rates.cover_bleed_in)) errors.push("cover_bleed_in must be a number.");

  for (const [group, fields] of Object.entries(RATE_FIELDS)) {
    const options = rates[group];
    if (!options || typeof options !== "object" || Object.keys(options).length === 0) {
      errors.push(`${group} needs at least one option.`);
      continue;
    }
    for (const [key, opt] of Object.entries(options as Record<string, Record<string, unknown>>)) {
      if (!/^[a-z0-9._-]{1,20}$/i.test(key)) errors.push(`${group}: option key "${key}" should be short, using letters, numbers, dot or dash.`);
      if (!opt || typeof opt.label !== "string" || !opt.label.trim()) errors.push(`${group}.${key} needs a label.`);
      for (const f of fields) {
        if (!num(opt?.[f])) errors.push(`${group}.${key}.${f} must be a number of 0 or more.`);
      }
      if (group === "trim_sizes" && opt?.page_multiplier === 0) errors.push(`${group}.${key}.page_multiplier can't be 0.`);
    }
  }
  return errors;
}

export function validateFees(f: Partial<Fees>): string[] {
  const e: string[] = [];
  const ok = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
  if (!ok(f.platform_fee_per_copy, 10000)) e.push("Platform fee must be between 0 and 10,000.");
  if (!ok(f.gateway_percent, 20)) e.push("Gateway % must be between 0 and 20.");
  if (!ok(f.gateway_gst_percent, 50)) e.push("GST % must be between 0 and 50.");
  return e;
}

export function validateShipping(s: Partial<Shipping>): string[] {
  const e: string[] = [];
  const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100000;
  if (!ok(s.flat)) e.push("Shipping charge must be 0 or more.");
  if (!ok(s.free_above)) e.push("Free shipping threshold must be 0 or more.");
  return e;
}
