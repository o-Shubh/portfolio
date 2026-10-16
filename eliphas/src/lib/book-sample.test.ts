import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSampleRange, sampleLimit } from "./book-sample.ts";

test("sample limit is 10% of the book, 1 to 30 pages", () => {
  assert.equal(sampleLimit(24), 2);
  assert.equal(sampleLimit(120), 12);
  assert.equal(sampleLimit(800), 30);
  assert.equal(sampleLimit(5), 1);
});

test("sample ranges are checked", () => {
  assert.equal(checkSampleRange(1, 12, 120), null);
  assert.equal(checkSampleRange(5, 16, 120), null);
  assert.match(checkSampleRange(1, 13, 120)!, /up to 12 pages/);
  assert.match(checkSampleRange(110, 125, 120)!, /has 120 pages/);
  assert.match(checkSampleRange(10, 5, 120)!, /after the first/);
  assert.match(checkSampleRange(0, 3, 120)!, /after the first/);
  assert.match(checkSampleRange(1.5, 3, 120)!, /whole page/);
});
