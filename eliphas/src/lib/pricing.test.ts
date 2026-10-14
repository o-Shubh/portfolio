// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { earnings, minimumMrp, paymentFee, printCost, rupees, shippingFor, sortedOptions, validateRates, type PrintRates } from "./pricing.ts";

// Same values as the default settings migration
const rates: PrintRates = {
  min_pages: 24,
  max_pages: 800,
  trim_sizes: { "5x8": { label: "x", page_multiplier: 1 }, "6x9": { label: "x", page_multiplier: 1.15 } },
  interior: { bw: { label: "x", per_page: 0.45 }, color: { label: "x", per_page: 2.8 } },
  paper: { cream: { label: "x", per_page_extra: 0 }, white: { label: "x", per_page_extra: 0.05 } },
  binding: { paperback: { label: "x", base: 30 }, hardcover: { label: "x", base: 140 } },
  cover_finish: { matte: { label: "x", extra: 0 } },
};
const fees = { platform_fee_per_copy: 15, gateway_percent: 2, gateway_gst_percent: 18 };
const base = { trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };

test("print cost: 200-page 5x8 B&W paperback = 30 + 200 × 0.45 = ₹120", () => {
  assert.equal(printCost({ ...base, page_count: 200 }, rates), 120);
});

test("print cost rounds up and applies size multiplier and paper extra", () => {
  // 30 + 101 × (0.45 + 0.05) × 1.15 = 88.075 -> 89
  assert.equal(printCost({ ...base, page_count: 101, trim_size: "6x9", paper: "white" }, rates), 89);
});

test("print cost is null for unknown options", () => {
  assert.equal(printCost({ ...base, page_count: 100, binding: "spiral" }, rates), null);
});

test("payment fee: 2% + 18% GST of ₹299 = ₹7.06", () => {
  assert.equal(paymentFee(299, fees), 7.06);
});

test("earning = MRP − print − ₹15 − payment charges", () => {
  const e = earnings(299, 120, fees);
  assert.equal(e.authorEarning, 156.94); // 299 − 120 − 15 − 7.06
});

test("minimum MRP gives at least the requested earning", () => {
  const mrp = minimumMrp(120, fees, 1);
  assert.ok(earnings(mrp, 120, fees).authorEarning >= 1);
  assert.ok(earnings(mrp - 1, 120, fees).authorEarning < 1);
});

test("shipping is free at or above the threshold", () => {
  assert.equal(shippingFor(498, { flat: 60, free_above: 499 }), 60);
  assert.equal(shippingFor(499, { flat: 60, free_above: 499 }), 0);
});

test("rupees uses Indian grouping", () => {
  assert.equal(rupees(123456), "₹1,23,456");
  assert.equal(rupees(7.5), "₹7.50");
});

test("options sort small-to-large / cheapest first", () => {
  const sizes = { a5: { label: "A5", page_multiplier: 1.05, width_in: 5.83 }, "5x8": { label: "5x8", page_multiplier: 1, width_in: 5 }, "6x9": { label: "6x9", page_multiplier: 1.15, width_in: 6 } };
  assert.deepEqual(sortedOptions(sizes).map(([k]) => k), ["5x8", "a5", "6x9"]);
  assert.deepEqual(sortedOptions(rates.binding).map(([k]) => k), ["paperback", "hardcover"]);
});

test("validateRates accepts the defaults and catches mistakes", () => {
  const good = {
    ...rates,
    trim_sizes: { "5x8": { label: "5x8", page_multiplier: 1, width_in: 5, height_in: 8 } },
    paper: { cream: { label: "Cream", per_page_extra: 0, spine_mm_per_page: 0.055 } },
  };
  assert.deepEqual(validateRates(good), []);
  const bad = structuredClone(good);
  bad.interior.bw.per_page = -1;
  (bad.binding.paperback as { label: string }).label = "";
  bad.max_pages = 10;
  const errs = validateRates(bad);
  assert.ok(errs.some((e) => e.includes("interior.bw.per_page")));
  assert.ok(errs.some((e) => e.includes("binding.paperback needs a label")));
  assert.ok(errs.some((e) => e.includes("max_pages")));
});
