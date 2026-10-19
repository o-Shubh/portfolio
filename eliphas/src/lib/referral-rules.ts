// Referral programme rules. Pure functions (no imports), unit tested directly.
// Amounts in settings are whole rupees; the functions below work in paise like the rest of the money code.

export type ReferralSettings = {
  enabled: boolean;
  reader_enabled: boolean;
  reader_friend_discount: number;
  reader_referrer_credit: number;
  author_enabled: boolean;
  author_buyer_discount: number;
  author_credit: number;
  author_author_enabled: boolean;
  author_author_credit: number;
  min_order: number;
  monthly_cap: number;
  credit_expiry_days: number;
  reward_wait_days: number;
  max_credit_percent: number;
};

/** Everything off and zero: the programme only runs once an admin sets it up. */
export const REFERRAL_DEFAULTS: ReferralSettings = {
  enabled: false,
  reader_enabled: false,
  reader_friend_discount: 0,
  reader_referrer_credit: 0,
  author_enabled: false,
  author_buyer_discount: 0,
  author_credit: 0,
  author_author_enabled: false,
  author_author_credit: 0,
  min_order: 0,
  monthly_cap: 0,
  credit_expiry_days: 180,
  reward_wait_days: 7,
  max_credit_percent: 50,
};

export const REFERRAL_SWITCHES = ["enabled", "reader_enabled", "author_enabled", "author_author_enabled"] as const;
type NumberKey = Exclude<keyof ReferralSettings, (typeof REFERRAL_SWITCHES)[number]>;

/** Allowed range for each number (whole rupees, days or percent). */
export const REFERRAL_LIMITS: Record<NumberKey, { min: number; max: number; label: string }> = {
  reader_friend_discount: { min: 0, max: 2000, label: "Friend's discount" },
  reader_referrer_credit: { min: 0, max: 2000, label: "Credit for the reader who invited" },
  author_buyer_discount: { min: 0, max: 2000, label: "New customer's discount" },
  author_credit: { min: 0, max: 2000, label: "Credit for the author" },
  author_author_credit: { min: 0, max: 5000, label: "Credit for each author" },
  min_order: { min: 0, max: 100000, label: "Minimum first order" },
  monthly_cap: { min: 0, max: 100000, label: "Monthly limit per person" },
  credit_expiry_days: { min: 7, max: 730, label: "Credit expires after (days)" },
  reward_wait_days: { min: 0, max: 60, label: "Wait after delivery (days)" },
  max_credit_percent: { min: 0, max: 100, label: "Credit can pay up to (% of books)" },
};

/** Reads the stored settings, filling gaps with the switched-off defaults and clamping numbers into range. */
export function parseReferralSettings(raw: unknown): ReferralSettings {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...REFERRAL_DEFAULTS };
  for (const k of REFERRAL_SWITCHES) out[k] = v[k] === true;
  for (const [k, lim] of Object.entries(REFERRAL_LIMITS) as [NumberKey, (typeof REFERRAL_LIMITS)[NumberKey]][]) {
    const n = Number(v[k]);
    out[k] = Number.isFinite(n) ? Math.min(lim.max, Math.max(lim.min, Math.floor(n))) : REFERRAL_DEFAULTS[k];
  }
  return out;
}

/** Problems with settings an admin entered (raw form values). */
export function validateReferralSettings(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const [k, lim] of Object.entries(REFERRAL_LIMITS)) {
    const raw = String(input[k] ?? "").trim();
    const n = Number(raw);
    if (raw === "" || !Number.isInteger(n) || n < lim.min || n > lim.max) errors.push(`${lim.label}: enter a whole number from ${lim.min} to ${lim.max}.`);
  }
  return errors;
}

export type ReferrerKind = "reader" | "author";

/** Is the programme for this kind of inviter running? */
export function programmeOn(s: ReferralSettings, kind: ReferrerKind) {
  return s.enabled && (kind === "author" ? s.author_enabled : s.reader_enabled);
}

/**
 * The invited friend's discount on their first order (paise). Zero when the programme is off or the books are
 * below the minimum. Never more than the books value less ₹1, so something is always paid.
 */
export function friendDiscountPaise(s: ReferralSettings, kind: ReferrerKind, booksPaise: number) {
  if (!programmeOn(s, kind) || booksPaise < s.min_order * 100) return 0;
  const amount = (kind === "author" ? s.author_buyer_discount : s.reader_friend_discount) * 100;
  return Math.max(0, Math.min(amount, booksPaise - 100));
}

/** Credit the inviter gets when the friend's first order is delivered (paise). */
export function inviterRewardPaise(s: ReferralSettings, kind: ReferrerKind) {
  if (!programmeOn(s, kind)) return 0;
  return (kind === "author" ? s.author_credit : s.reader_referrer_credit) * 100;
}

/** Credit for each side when an invited person publishes their first book (paise). */
export function authorInviteRewardPaise(s: ReferralSettings) {
  return s.enabled && s.author_author_enabled ? s.author_author_credit * 100 : 0;
}

/**
 * How much credit an order can use (whole rupees, in paise): no more than the balance, no more than
 * max_credit_percent of the books value after any invite discount, and always leaving at least ₹1 to pay.
 */
export function usableCreditPaise(balancePaise: number, booksAfterDiscountPaise: number, maxPercent: number) {
  if (balancePaise <= 0 || booksAfterDiscountPaise <= 100 || maxPercent <= 0) return 0;
  const byPercent = Math.floor((booksAfterDiscountPaise * maxPercent) / 100);
  const paise = Math.min(balancePaise, byPercent, booksAfterDiscountPaise - 100);
  return Math.max(0, Math.floor(paise / 100) * 100);
}

/** Invite codes: 8 characters without look-alikes (no 0/O, 1/I/L). `random` returns values in [0, 1). */
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newReferralCode(random: () => number = Math.random) {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return code;
}
export const isReferralCode = (s: string) => /^[A-Z0-9]{6,10}$/.test(s);

/** An invite only counts for an account set up within a day of being created. */
export const isNewAccount = (createdAt: string | Date, now = new Date()) => now.getTime() - new Date(createdAt).getTime() < 24 * 3600 * 1000;

/** Address key for spotting the same household: first address line (letters and digits only) + PIN code. */
export const addressKey = (line1: string | null, pincode: string | null) =>
  `${(line1 ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}|${(pincode ?? "").trim()}`;

/**
 * True when a friend's order looks like it went to the inviter: same phone as the inviter, or an address the
 * inviter has used for their own orders.
 */
export function looksLikeInviter(
  order: { ship_phone: string; ship_line1: string; ship_pincode: string },
  inviter: { phone: string | null; addresses: string[] },
) {
  if (inviter.phone && order.ship_phone === inviter.phone) return true;
  return inviter.addresses.includes(addressKey(order.ship_line1, order.ship_pincode));
}
