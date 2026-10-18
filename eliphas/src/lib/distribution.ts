export const CHANNELS = { amazon_india: "Amazon India", flipkart: "Flipkart", international: "International distribution" } as const;
export const REVIEW_STATUSES = ["reviewing", "needs_information", "declined"] as const;
export function distributionEstimate(receipts: number, costs: number, share: number, overhead: number, minimum: number) {
 if (![receipts, costs, overhead, minimum].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000) || !Number.isFinite(share) || share < 0 || share > 100) throw new Error("Enter valid, non-negative amounts and a share from 0 to 100.");
 const pool = receipts - costs;
 const platform = Math.round(Math.max(0, pool) * share / 100);
 const author = Math.max(0, pool) - platform;
 const contribution = platform - overhead + Math.min(0, pool);
 return { pool, platform, author, contribution, viable: pool > 0 && contribution >= minimum };
}
