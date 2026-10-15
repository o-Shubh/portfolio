import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocate,
  commissionPerCopy,
  estimateCopy,
  minimumPriceRupees,
  percentOf,
  splitOrder,
  withGst,
  type CommissionRule,
} from "./commission.ts";
import { bestPromotion, bookWeightGrams, quoteShipping, ratePaise, zoneFor, type ShippingZone } from "./shipping.ts";

const FREE: CommissionRule = { plan: "free", percent: 15, minPaise: 3500, gstPercent: 18 };
const PRO: CommissionRule = { plan: "pro", percent: 10, minPaise: 2500, gstPercent: 18 };
const LEGACY: CommissionRule = { plan: "legacy", percent: 0, minPaise: 1500, gstPercent: 0 };

test("spec example: ₹299 book, ₹120 print, 2.36% gateway — Free", () => {
  const e = estimateCopy(29900, 12000, FREE, 2.36);
  assert.equal(e.commissionPaise, 4485);
  assert.equal(e.commissionGstPaise, 807);
  assert.equal(e.gatewayPaise, 706);
  assert.equal(e.authorEarningPaise, 11902);
});

test("spec example — Pro", () => {
  const e = estimateCopy(29900, 12000, PRO, 2.36);
  assert.equal(e.commissionPaise, 2990);
  assert.equal(e.commissionGstPaise, 538);
  assert.equal(e.gatewayPaise, 706);
  assert.equal(e.authorEarningPaise, 13666);
});

test("minimum commission applies per copy", () => {
  assert.equal(commissionPerCopy(19900, FREE), 3500); // 15% = ₹29.85 → minimum ₹35
  assert.equal(commissionPerCopy(23400, FREE), 3510); // 15% = ₹35.10
  assert.equal(commissionPerCopy(19900, PRO), 2500); // 10% = ₹19.90 → minimum ₹25
  assert.equal(commissionPerCopy(29900, LEGACY), 1500); // original flat ₹15
});

test("GST rounding is half-up to the paisa", () => {
  assert.equal(percentOf(2990, 18), 538); // 538.2
  assert.equal(percentOf(4485, 18), 807); // 807.3
  assert.equal(percentOf(25, 18), 5); // 4.5 → 5
  assert.equal(percentOf(29900, 2.36), 706); // 705.64
});

test("Pro price with GST is ₹352.82", () => {
  assert.deepEqual(withGst(29900, 18), { basePaise: 29900, gstPaise: 5382, totalPaise: 35282 });
});

test("allocation always adds up exactly", () => {
  for (const [total, weights] of [
    [706, [29900, 6000]],
    [1, [1, 1, 1]],
    [1000, [3, 3, 3]],
    [12345, [100, 0, 250, 999]],
  ] as [number, number[]][]) {
    const parts = allocate(total, weights);
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
    parts.forEach((p) => assert.ok(p >= 0));
  }
  assert.deepEqual(allocate(0, [1, 2]), [0, 0]);
});

test("multi-copy, multi-author order: gateway split over books and shipping, never double-charged", () => {
  const s = splitOrder(
    [
      { key: "a", authorId: "author-1", unitPricePaise: 29900, quantity: 2, printCostPaise: 12000, rule: FREE },
      { key: "b", authorId: "author-2", unitPricePaise: 19900, quantity: 1, printCostPaise: 9000, rule: PRO },
    ],
    8000,
    { percent: 2.36 },
  );
  assert.equal(s.booksPaise, 79700);
  assert.equal(s.totalPaise, 87700);
  assert.equal(s.gatewayTotalPaise, percentOf(87700, 2.36));
  const allocated = s.lines.reduce((a, l) => a + l.gatewayPaise, 0) + s.gatewayShippingPaise;
  assert.equal(allocated, s.gatewayTotalPaise, "gateway fully allocated, once");
  const [a, b] = s.lines;
  assert.equal(a.commissionPaise, 4485 * 2);
  assert.equal(a.commissionGstPaise, 807 * 2);
  assert.equal(b.commissionPaise, 2500); // Pro minimum
  assert.equal(b.commissionGstPaise, 450);
  // Each line's numbers add back up to what the reader paid for it
  for (const l of s.lines) {
    assert.equal(l.authorEarningPaise + l.printCostTotalPaise + l.commissionPaise + l.commissionGstPaise + l.gatewayPaise, l.lineValuePaise);
  }
});

test("actual gateway fee replaces the estimate", () => {
  const s = splitOrder([{ key: "a", authorId: "x", unitPricePaise: 29900, quantity: 1, printCostPaise: 12000, rule: FREE }], 6000, { actualPaise: 850 });
  assert.equal(s.gatewayTotalPaise, 850);
  assert.equal(s.lines[0].gatewayPaise + s.gatewayShippingPaise, 850);
});

test("platform-funded discount does not reduce the author's earning", () => {
  const plain = splitOrder([{ key: "a", authorId: "x", unitPricePaise: 29900, quantity: 1, printCostPaise: 12000, rule: FREE }], 0, { actualPaise: 0 });
  const disc = splitOrder([{ key: "a", authorId: "x", unitPricePaise: 29900, quantity: 1, printCostPaise: 12000, rule: FREE, platformDiscountPaise: 5000 }], 0, { actualPaise: 0 });
  assert.equal(disc.booksPaise, 24900);
  assert.equal(disc.lines[0].authorEarningPaise, plain.lines[0].authorEarningPaise);
});

test("minimum price keeps the author's earning at ₹1 or more", () => {
  for (const rule of [FREE, PRO, LEGACY]) {
    const min = minimumPriceRupees(12000, rule, 2.36);
    assert.ok(estimateCopy(min * 100, 12000, rule, 2.36).authorEarningPaise >= 100);
    assert.ok(estimateCopy((min - 1) * 100, 12000, rule, 2.36).authorEarningPaise < 100);
  }
});

// ---------- Shipping ----------
const zones: ShippingZone[] = [
  { id: "all", name: "All India", pincode_prefixes: [""], extra_per_500g_paise: 3000, active: true },
  { id: "metro", name: "Delhi", pincode_prefixes: ["110"], extra_per_500g_paise: 2000, active: true },
  { id: "off", name: "Closed", pincode_prefixes: ["999"], extra_per_500g_paise: 0, active: false },
];
const rates = [
  { zone_id: "all", max_weight_g: 500, price_paise: 6000 },
  { zone_id: "all", max_weight_g: 1000, price_paise: 8000 },
  { zone_id: "metro", max_weight_g: 500, price_paise: 4000 },
];
const parcel = { paper_gsm: 70, cover_grams: { paperback: 20, hardcover: 160 }, packaging_grams: 60 };

test("book weight from pages and trim size", () => {
  // 200 pages, 5×8 in: 100 sheets × 40 in² × 0.00064516 × 70 g = 180.6 g + 20 g cover
  assert.equal(bookWeightGrams({ page_count: 200, width_in: 5, height_in: 8, binding: "paperback" }, parcel), 201);
});

test("zone by longest PIN prefix, inactive zones ignored", () => {
  assert.equal(zoneFor("110001", zones)?.id, "metro");
  assert.equal(zoneFor("400001", zones)?.id, "all");
  assert.equal(zoneFor("999001", zones)?.id, "all");
  assert.equal(zoneFor("400001", [zones[1]]), null);
});

test("weight slabs and extra per 500 g", () => {
  assert.equal(ratePaise(400, zones[0], rates), 6000);
  assert.equal(ratePaise(900, zones[0], rates), 8000);
  assert.equal(ratePaise(1001, zones[0], rates), 11000); // +1 step
  assert.equal(ratePaise(1600, zones[0], rates), 14000); // +2 steps
});

test("unserviceable PIN code is refused, not guessed", () => {
  const q = quoteShipping({ pincode: "400001", weightG: 300, booksPaise: 29900, zones: [zones[1]], rates, promotions: [] });
  assert.equal(q.serviceable, false);
});

test("platform-funded promotion: best discount applies only when active and above minimum", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  const promos = [
    { id: "p1", name: "₹20 off", kind: "flat_off" as const, amount_paise: 2000, min_books_paise: 0, starts_at: "2026-11-01", ends_at: null, active: true },
    { id: "p2", name: "Free over ₹999", kind: "free" as const, amount_paise: 0, min_books_paise: 99900, starts_at: "2026-11-01", ends_at: null, active: true },
    { id: "p3", name: "Expired", kind: "free" as const, amount_paise: 0, min_books_paise: 0, starts_at: "2026-10-01", ends_at: "2026-10-31", active: true },
  ];
  assert.equal(bestPromotion(6000, 29900, promos, now)?.promo.id, "p1");
  assert.equal(bestPromotion(6000, 120000, promos, now)?.promo.id, "p2");
  const q = quoteShipping({ pincode: "400001", weightG: 300, booksPaise: 29900, zones, rates, promotions: promos, now });
  assert.ok(q.serviceable && q.chargePaise === 4000 && q.discountPaise === 2000 && q.promotionId === "p1");
});
