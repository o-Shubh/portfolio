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
  trim_sizes: Record<string, Option & { page_multiplier: number }>;
  interior: Record<string, Option & { per_page: number }>;
  paper: Record<string, Option & { per_page_extra: number }>;
  binding: Record<string, Option & { base: number }>;
  cover_finish: Record<string, Option & { extra: number }>;
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
