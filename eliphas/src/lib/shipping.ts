// Shipping quotes from admin-managed zones (by PIN-code prefix), weight slabs and promotions.
// Pure functions; the server loads the tables and passes them in.

export type ShippingZone = {
  id: string;
  name: string;
  pincode_prefixes: string[];
  extra_per_500g_paise: number;
  active: boolean;
  is_sample?: boolean;
};
export type ShippingRate = { zone_id: string; max_weight_g: number; price_paise: number };
export type ShippingPromotion = {
  id: string;
  name: string;
  kind: "free" | "flat_off";
  amount_paise: number;
  min_books_paise: number;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
};
export type ParcelSettings = {
  paper_gsm: number;
  cover_grams: Record<string, number>;
  packaging_grams: number;
};

const SQ_INCH_IN_SQ_M = 0.00064516;

/** Estimated weight of one copy in grams, from page count, trim size and binding. */
export function bookWeightGrams(
  b: { page_count: number; width_in: number; height_in: number; binding: string },
  p: ParcelSettings,
): number {
  const sheets = Math.ceil(b.page_count / 2);
  const paper = sheets * b.width_in * b.height_in * SQ_INCH_IN_SQ_M * p.paper_gsm;
  const cover = p.cover_grams[b.binding] ?? p.cover_grams.paperback ?? 20;
  return Math.ceil(paper + cover);
}

/** Total parcel weight: all copies in one box plus packaging (one printer ships them together). */
export function parcelWeightGrams(copies: { grams: number; quantity: number }[], p: ParcelSettings): number {
  return copies.reduce((sum, c) => sum + c.grams * c.quantity, 0) + p.packaging_grams;
}

/** The zone for a PIN code: the active zone with the longest matching prefix. */
export function zoneFor(pincode: string, zones: ShippingZone[]): ShippingZone | null {
  let best: ShippingZone | null = null;
  let bestLen = -1;
  for (const z of zones) {
    if (!z.active) continue;
    for (const prefix of z.pincode_prefixes) {
      if (pincode.startsWith(prefix) && prefix.length > bestLen) {
        best = z;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

/** Base price for a weight in a zone: the smallest slab that fits, then extra per 500 g above the largest slab. */
export function ratePaise(weightG: number, zone: ShippingZone, rates: ShippingRate[]): number | null {
  const slabs = rates.filter((r) => r.zone_id === zone.id).sort((a, b) => a.max_weight_g - b.max_weight_g);
  if (!slabs.length) return null;
  const fit = slabs.find((s) => weightG <= s.max_weight_g);
  if (fit) return fit.price_paise;
  const top = slabs[slabs.length - 1];
  if (zone.extra_per_500g_paise <= 0) return null; // heavier than any slab and no extra rate
  const extraSteps = Math.ceil((weightG - top.max_weight_g) / 500);
  return top.price_paise + extraSteps * zone.extra_per_500g_paise;
}

export type ShippingQuote =
  | { serviceable: false; reason: string }
  | {
      serviceable: true;
      zoneId: string;
      zoneName: string;
      isSample: boolean;
      weightG: number;
      basePaise: number;
      discountPaise: number; // platform-funded promotion
      promotionId: string | null;
      promotionName: string | null;
      chargePaise: number; // what the reader pays
    };

/** The best active promotion for this order (largest discount), if any. */
export function bestPromotion(basePaise: number, booksPaise: number, promos: ShippingPromotion[], now: Date) {
  let best: { promo: ShippingPromotion; discount: number } | null = null;
  for (const p of promos) {
    if (!p.active) continue;
    if (new Date(p.starts_at) > now) continue;
    if (p.ends_at && new Date(p.ends_at) <= now) continue;
    if (booksPaise < p.min_books_paise) continue;
    const discount = p.kind === "free" ? basePaise : Math.min(basePaise, p.amount_paise);
    if (!best || discount > best.discount) best = { promo: p, discount };
  }
  return best;
}

export function quoteShipping(input: {
  pincode: string;
  weightG: number;
  booksPaise: number;
  zones: ShippingZone[];
  rates: ShippingRate[];
  promotions: ShippingPromotion[];
  now?: Date;
}): ShippingQuote {
  if (!/^[1-9]\d{5}$/.test(input.pincode)) return { serviceable: false, reason: "Enter a valid 6-digit PIN code." };
  const zone = zoneFor(input.pincode, input.zones);
  if (!zone) return { serviceable: false, reason: "Sorry, we don't deliver to this PIN code yet." };
  const base = ratePaise(input.weightG, zone, input.rates);
  if (base === null) return { serviceable: false, reason: "This parcel is too heavy for our current delivery rates. Try fewer copies." };
  const promo = bestPromotion(base, input.booksPaise, input.promotions, input.now ?? new Date());
  const discount = promo?.discount ?? 0;
  return {
    serviceable: true,
    zoneId: zone.id,
    zoneName: zone.name,
    isSample: Boolean(zone.is_sample),
    weightG: input.weightG,
    basePaise: base,
    discountPaise: discount,
    promotionId: promo?.promo.id ?? null,
    promotionName: promo?.promo.name ?? null,
    chargePaise: base - discount,
  };
}
