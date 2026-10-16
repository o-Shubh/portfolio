import assert from "node:assert/strict";
import { test } from "node:test";
import { addOnBlocked, checkAddOns } from "./services.ts";

const none = new Set<string>();

test("add-ons: single services and the bundle can be requested for a fresh book", () => {
  assert.deepEqual(checkAddOns(["basic_cover", "launch_kit"], none), { ok: ["basic_cover", "launch_kit"] });
  assert.deepEqual(checkAddOns(["bundle"], none), { ok: ["bundle"] });
  assert.deepEqual(checkAddOns(["formatting", "formatting"], none), { ok: ["formatting"] });
});

test("add-ons: nothing ticked is refused", () => {
  assert.ok("error" in checkAddOns([], none));
});

test("add-ons: the bundle can't be combined with what it already includes", () => {
  assert.ok("error" in checkAddOns(["bundle", "basic_cover"], none));
  assert.equal(addOnBlocked("formatting", none, new Set(["bundle"])), "Included in the bundle");
});

test("add-ons: open requests for the same book block duplicates and overlaps", () => {
  assert.ok("error" in checkAddOns(["basic_cover"], new Set(["basic_cover"])));
  assert.ok("error" in checkAddOns(["launch_kit"], new Set(["bundle"])));
  assert.ok("error" in checkAddOns(["bundle"], new Set(["formatting"])));
  assert.equal(addOnBlocked("launch_kit", new Set(["basic_cover"])), null);
});

import { upgradeQuoteLines } from "./services.ts";

const priors = [
  { id: "a", label: "Basic Book Cover SRV-1", paidPaise: 149900 },
  { id: "b", label: "Launch Kit SRV-2", paidPaise: 0 },
];

test("upgrade quote: no credit unless admin enters one", () => {
  assert.deepEqual(upgradeQuoteLines("Book Design & Launch Bundle", 399900, priors, {}), {
    lines: [{ label: "Book Design & Launch Bundle", amount_paise: 399900 }],
    basePaise: 399900,
  });
});

test("upgrade quote: itemised credit for a paid request", () => {
  const r = upgradeQuoteLines("Bundle", 399900, priors, { a: 100000 });
  assert.ok("lines" in r);
  assert.equal(r.basePaise, 299900);
  assert.deepEqual(r.lines[1], { label: "Credit: Basic Book Cover SRV-1", amount_paise: -100000 });
});

test("upgrade quote: credits are capped at what was paid and can't zero the total", () => {
  assert.ok("error" in upgradeQuoteLines("Bundle", 399900, priors, { a: 149901 }));
  assert.ok("error" in upgradeQuoteLines("Bundle", 399900, priors, { b: 1 }));
  assert.ok("error" in upgradeQuoteLines("Bundle", 100000, priors, { a: 100000 }));
  assert.ok("error" in upgradeQuoteLines("Bundle", 399900, priors, { a: -5 }));
  assert.ok("error" in upgradeQuoteLines("Bundle", 0, priors, {}));
});

test("add-ons: a completed part of the bundle still blocks a new bundle (upgrade instead)", () => {
  const done = new Set(["basic_cover"]);
  assert.ok("error" in checkAddOns(["bundle"], new Set(), done));
  assert.match(String(addOnBlocked("bundle", new Set(), new Set(), done)), /bundle upgrade/);
  assert.equal(addOnBlocked("launch_kit", new Set(), new Set(), done), null);
});
