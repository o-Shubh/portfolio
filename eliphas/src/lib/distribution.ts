// Distribution requests: authors ask us to review a published book for other sales channels.
// Intake and planning only. No retailer is connected, nothing is charged and royalties are unchanged.

export const CHANNELS = {
  amazon_india: "Amazon India",
  flipkart: "Flipkart",
  international: "International distribution",
} as const;
export type Channel = keyof typeof CHANNELS;

/** Statuses an admin can set. "requested" is only the starting state. */
export const REVIEW_STATUSES = ["reviewing", "needs_information", "declined"] as const;
export type DistributionStatus = "requested" | (typeof REVIEW_STATUSES)[number];

export const DISTRIBUTION_STATUS: Record<DistributionStatus, { label: string; tone: string }> = {
  requested: { label: "Requested", tone: "bg-surface-3 text-fg" },
  reviewing: { label: "In review", tone: "bg-tint-info text-accent-fg" },
  needs_information: {
    label: "Needs information",
    tone: "bg-tint-warn text-marigold-fg",
  },
  declined: { label: "Declined", tone: "bg-tint-danger text-danger" },
};

export function channelLabel(channel: string): string {
  return CHANNELS[channel as Channel] ?? channel;
}

export function statusOf(status: string) {
  return (
    DISTRIBUTION_STATUS[status as DistributionStatus] ?? {
      label: status,
      tone: "bg-surface-3 text-fg",
    }
  );
}

/**
 * Planning estimate for one copy sold through a channel. All amounts in paise (one currency, same tax basis).
 * - receipts: what the retailer pays out, already net of the retailer's own deductions
 * - costs: remaining print, shipping, tax and risk costs (excluding those same deductions)
 * - share: proposed platform share (%) of the positive surplus
 * - overhead: platform operating cost per copy
 * - minimum: contribution per copy the result must reach
 * A negative surplus is a platform loss; the author estimate never goes below zero.
 */
export function distributionEstimate(receipts: number, costs: number, share: number, overhead: number, minimum: number) {
  if (
    ![receipts, costs, overhead, minimum].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000) ||
    !Number.isFinite(share) ||
    share < 0 ||
    share > 100
  )
    throw new Error("Enter valid, non-negative amounts and a share from 0 to 100.");
  const pool = receipts - costs;
  const platform = Math.round((Math.max(0, pool) * share) / 100);
  const author = Math.max(0, pool) - platform;
  const contribution = platform - overhead + Math.min(0, pool);
  return {
    pool,
    platform,
    author,
    contribution,
    viable: pool > 0 && contribution >= minimum,
  };
}
