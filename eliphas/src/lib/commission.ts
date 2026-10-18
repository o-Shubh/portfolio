// Retail royalty maths in whole paise (integers), so totals always add up exactly.
// Pure functions: used on the server for orders and in the browser for calculators.
//
// Author earnings = book selling price − print cost − platform commission
//                   − GST on the commission − allocated payment gateway cost.
// Commission never applies to shipping. The minimum commission applies per copy.

export type CommissionRule = {
  plan: "legacy" | "free" | "pro";
  versionId?: string;
  percent: number; // e.g. 15
  minPaise: number; // e.g. 3500
  gstPercent: number; // GST on the commission, e.g. 18
};

/** Rupees (number) → whole paise. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);
/** Whole paise → rupees (number with 2 decimals). */
export const toRupees = (paise: number) => paise / 100;

/** `percent` of an amount in paise, rounded half up to the nearest paisa. */
export function percentOf(paise: number, percent: number): number {
  // Work in hundredths of a percent to avoid float drift (e.g. 2.36% of ₹299 = 705.64 paise → 706)
  const scaled = paise * Math.round(percent * 100);
  return Math.floor((scaled + 5000) / 10000);
}

/** Commission on one copy: percent of the selling price, but never below the minimum. */
export function commissionPerCopy(pricePaise: number, rule: CommissionRule): number {
  return Math.max(percentOf(pricePaise, rule.percent), rule.minPaise);
}

export type CopyEstimate = {
  pricePaise: number;
  printCostPaise: number;
  commissionPaise: number;
  commissionGstPaise: number;
  gatewayPaise: number;
  authorEarningPaise: number;
};

/**
 * Estimated split of one copy, with the gateway cost estimated as a percentage of the book
 * price (e.g. 2.36% = Razorpay 2% + 18% GST). Used before an order exists.
 */
export function estimateCopy(pricePaise: number, printCostPaise: number, rule: CommissionRule, gatewayPercent: number): CopyEstimate {
  const commissionPaise = commissionPerCopy(pricePaise, rule);
  const commissionGstPaise = percentOf(commissionPaise, rule.gstPercent);
  const gatewayPaise = percentOf(pricePaise, gatewayPercent);
  return {
    pricePaise,
    printCostPaise,
    commissionPaise,
    commissionGstPaise,
    gatewayPaise,
    authorEarningPaise: pricePaise - printCostPaise - commissionPaise - commissionGstPaise - gatewayPaise,
  };
}

/** Lowest whole-rupee price at which the author earns at least `minEarningPaise` per copy. */
export function minimumPriceRupees(printCostPaise: number, rule: CommissionRule, gatewayPercent: number, minEarningPaise = 100): number {
  let rupees = Math.max(1, Math.ceil((printCostPaise + rule.minPaise) / 100));
  while (estimateCopy(rupees * 100, printCostPaise, rule, gatewayPercent).authorEarningPaise < minEarningPaise) rupees++;
  return rupees;
}

/**
 * Splits `total` paise across parts in proportion to their weights, so the pieces always add
 * up to exactly `total` (largest-remainder method; ties go to the earlier part).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i]++;
    left--;
  }
  return out;
}

export type OrderLineInput = {
  key: string; // book id
  authorId: string;
  unitPricePaise: number;
  quantity: number;
  printCostPaise: number; // per copy
  rule: CommissionRule;
  /** Discount funded by the platform (paise per line). Never reduces the author's earning. */
  platformDiscountPaise?: number;
};

export type OrderLineSplit = OrderLineInput & {
  lineValuePaise: number; // what the reader pays for this line
  printCostTotalPaise: number;
  commissionPaise: number;
  commissionGstPaise: number;
  gatewayPaise: number;
  authorEarningPaise: number;
};

export type OrderSplit = {
  lines: OrderLineSplit[];
  booksPaise: number;
  shippingPaise: number;
  totalPaise: number;
  gatewayTotalPaise: number;
  gatewayShippingPaise: number; // the part of the gateway fee that belongs to shipping
};

/**
 * Prices an order. The gateway fee (actual, or estimated from `gatewayPercent`) is charged on
 * the whole payment including shipping, then allocated across book lines and shipping by value,
 * so nothing is charged twice. Platform-funded discounts lower what the reader pays but the
 * author's earning is worked out on the full price; the platform absorbs the difference.
 */
export function splitOrder(
  inputs: OrderLineInput[],
  shippingPaise: number,
  gateway: { percent: number } | { actualPaise: number },
): OrderSplit {
  const lineValues = inputs.map((l) => l.unitPricePaise * l.quantity - (l.platformDiscountPaise ?? 0));
  const booksPaise = lineValues.reduce((a, b) => a + b, 0);
  const totalPaise = booksPaise + shippingPaise;
  const gatewayTotalPaise = "actualPaise" in gateway ? gateway.actualPaise : percentOf(totalPaise, gateway.percent);
  const parts = allocate(gatewayTotalPaise, [...lineValues, shippingPaise]);

  const lines = inputs.map((l, i) => {
    const perCopyCommission = commissionPerCopy(l.unitPricePaise, l.rule);
    const commissionPaise = perCopyCommission * l.quantity;
    const commissionGstPaise = percentOf(perCopyCommission, l.rule.gstPercent) * l.quantity;
    const printCostTotalPaise = l.printCostPaise * l.quantity;
    const gatewayPaise = parts[i];
    // The author's share is computed on the undiscounted price
    const grossPaise = l.unitPricePaise * l.quantity;
    return {
      ...l,
      lineValuePaise: lineValues[i],
      printCostTotalPaise,
      commissionPaise,
      commissionGstPaise,
      gatewayPaise,
      authorEarningPaise: grossPaise - printCostTotalPaise - commissionPaise - commissionGstPaise - gatewayPaise,
    };
  });
  return { lines, booksPaise, shippingPaise, totalPaise, gatewayTotalPaise, gatewayShippingPaise: parts[parts.length - 1] };
}

/** Converts a database plan_versions row into a rule. */
export function ruleFromPlanVersion(pv: {
  id?: string;
  plan: string;
  commission_percent: number | string;
  commission_min_paise: number;
  commission_gst_percent: number | string;
}): CommissionRule {
  return {
    plan: pv.plan as CommissionRule["plan"],
    versionId: pv.id,
    percent: Number(pv.commission_percent),
    minPaise: pv.commission_min_paise,
    gstPercent: Number(pv.commission_gst_percent),
  };
}

/** Price plus GST, in paise. ₹299 + 18% = ₹352.82. */
export function withGst(basePaise: number, gstPercent: number) {
  const gstPaise = percentOf(basePaise, gstPercent);
  return { basePaise, gstPaise, totalPaise: basePaise + gstPaise };
}

/** ₹1,234.50 from paise. */
/** Indian-format rupees from paise. `fixed` always shows two decimals, so figures in a table share one precision. */
export function formatPaise(paise: number, fixed = false): string {
  const r = paise / 100;
  const digits = fixed || !Number.isInteger(r) ? 2 : 0;
  return "₹" + r.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 });
}
