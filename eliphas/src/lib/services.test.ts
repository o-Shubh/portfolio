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
