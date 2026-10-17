import { test } from "node:test";
import assert from "node:assert/strict";
import { ratingSummary } from "./rating.ts";

test("no reviews means no average (never an invented rating)", () => {
  assert.deepEqual(ratingSummary([]), { average: null, counts: [0, 0, 0, 0, 0], total: 0 });
});

test("average is rounded to one decimal and counts each star", () => {
  const s = ratingSummary([5, 4, 4, 1]);
  assert.equal(s.average, 3.5);
  assert.deepEqual(s.counts, [1, 0, 0, 2, 1]);
  assert.equal(s.total, 4);
  assert.equal(ratingSummary([5, 4, 4]).average, 4.3);
  assert.equal(ratingSummary([2, 3]).average, 2.5);
});

test("out-of-range values are ignored", () => {
  assert.deepEqual(ratingSummary([0, 6, 3.5, 5]), { average: 5, counts: [0, 0, 0, 0, 1], total: 1 });
});
