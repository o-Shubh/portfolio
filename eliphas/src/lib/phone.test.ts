import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPhone, toInternational } from "./phone.ts";

test("India: strict 10-digit mobile, with or without prefixes", () => {
  assert.equal(toInternational("IN", "98765 43210"), "+919876543210");
  assert.equal(toInternational("IN", "+91 98765-43210"), "+919876543210");
  assert.equal(toInternational("IN", "098765 43210"), "+919876543210");
  assert.equal(toInternational("IN", "12345 67890"), null);
  assert.equal(toInternational("IN", "98765"), null);
});

test("Other countries: trunk zero removed, length checked", () => {
  assert.equal(toInternational("GB", "07911 123456"), "+447911123456");
  assert.equal(toInternational("US", "(415) 555-2671"), "+14155552671");
  assert.equal(toInternational("AE", "050 123 4567"), "+971501234567");
  assert.equal(toInternational("GB", "+44 7911 123456"), "+447911123456");
  assert.equal(toInternational("GB", "+91 98765 43210"), null, "a different country's code is refused");
  assert.equal(toInternational("US", "555"), null);
  assert.equal(toInternational("US", "1234567890123456"), null);
});

test("formatPhone for display", () => {
  assert.equal(formatPhone("919876543210"), "+91 98765 43210");
  assert.equal(formatPhone("447911123456"), "+44 7911 123456");
  assert.equal(formatPhone("14155552671"), "+1 4155 552671");
  assert.equal(formatPhone(null), "");
});
