import test from "node:test";
import assert from "node:assert/strict";
import {
  addressKey,
  authorInviteRewardPaise,
  friendDiscountPaise,
  inviterRewardPaise,
  isNewAccount,
  isReferralCode,
  looksLikeInviter,
  newReferralCode,
  parseReferralSettings,
  REFERRAL_DEFAULTS,
  usableCreditPaise,
  validateReferralSettings,
} from "./referral-rules.ts";

const on = parseReferralSettings({
  enabled: true,
  reader_enabled: true,
  reader_friend_discount: 50,
  reader_referrer_credit: 40,
  author_enabled: true,
  author_buyer_discount: 30,
  author_credit: 25,
  author_author_enabled: true,
  author_author_credit: 100,
  min_order: 299,
});

test("defaults are switched off with zero amounts", () => {
  assert.deepEqual(parseReferralSettings(null), REFERRAL_DEFAULTS);
  assert.equal(friendDiscountPaise(REFERRAL_DEFAULTS, "reader", 100000), 0);
  assert.equal(inviterRewardPaise(REFERRAL_DEFAULTS, "author"), 0);
  assert.equal(authorInviteRewardPaise(REFERRAL_DEFAULTS), 0);
});

test("stored settings are cleaned: only true switches on, numbers clamped to whole values in range", () => {
  const s = parseReferralSettings({ enabled: "true", reader_friend_discount: 99999, max_credit_percent: -5, credit_expiry_days: "90.7", monthly_cap: "x" });
  assert.equal(s.enabled, false);
  assert.equal(s.reader_friend_discount, 2000);
  assert.equal(s.max_credit_percent, 0);
  assert.equal(s.credit_expiry_days, 90);
  assert.equal(s.monthly_cap, 0);
});

test("admin form validation needs whole numbers in range", () => {
  const ok = Object.fromEntries(Object.entries(REFERRAL_DEFAULTS).map(([k, v]) => [k, String(v)]));
  assert.deepEqual(validateReferralSettings(ok), []);
  assert.equal(validateReferralSettings({ ...ok, reader_friend_discount: "12.5" }).length, 1);
  assert.equal(validateReferralSettings({ ...ok, credit_expiry_days: "1" }).length, 1);
  assert.equal(validateReferralSettings({ ...ok, max_credit_percent: "" }).length, 1);
});

test("friend discount follows the inviter's programme and the minimum order", () => {
  assert.equal(friendDiscountPaise(on, "reader", 29900), 5000);
  assert.equal(friendDiscountPaise(on, "author", 29900), 3000);
  assert.equal(friendDiscountPaise(on, "reader", 29899), 0, "below the minimum");
  assert.equal(friendDiscountPaise({ ...on, reader_enabled: false }, "reader", 50000), 0);
  assert.equal(friendDiscountPaise({ ...on, enabled: false }, "author", 50000), 0, "master switch off");
  // Never the whole books value
  assert.equal(friendDiscountPaise({ ...on, min_order: 0, reader_friend_discount: 500 }, "reader", 20000), 19900);
});

test("rewards follow their switches", () => {
  assert.equal(inviterRewardPaise(on, "reader"), 4000);
  assert.equal(inviterRewardPaise(on, "author"), 2500);
  assert.equal(inviterRewardPaise({ ...on, author_enabled: false }, "author"), 0);
  assert.equal(authorInviteRewardPaise(on), 10000);
  assert.equal(authorInviteRewardPaise({ ...on, author_author_enabled: false }), 0);
});

test("usable credit: balance, percent of books, ₹1 left to pay, whole rupees", () => {
  assert.equal(usableCreditPaise(10000, 29900, 50), 10000);
  assert.equal(usableCreditPaise(50000, 29900, 50), 14900, "50% of ₹299 = ₹149.50 → ₹149");
  assert.equal(usableCreditPaise(50000, 29900, 100), 29800, "always ₹1 left");
  assert.equal(usableCreditPaise(-500, 29900, 50), 0, "owed credit can't be used");
  assert.equal(usableCreditPaise(10000, 29900, 0), 0);
  assert.equal(usableCreditPaise(4550, 29900, 50), 4500, "whole rupees only");
});

test("invite codes", () => {
  const code = newReferralCode();
  assert.match(code, /^[A-HJKMNP-Z2-9]{8}$/);
  assert.ok(isReferralCode(code));
  assert.equal(isReferralCode("abc12345"), false);
  assert.equal(
    newReferralCode(() => 0),
    "AAAAAAAA",
  );
});

test("only accounts created in the last day count as new", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  assert.ok(isNewAccount("2026-10-20T09:00:00Z", now));
  assert.equal(isNewAccount("2026-10-19T09:00:00Z", now), false);
});

test("spotting an order sent to the inviter", () => {
  const inviter = { phone: "919000000021", addresses: [addressKey("Flat 4, MG Road", "411001")] };
  assert.ok(looksLikeInviter({ ship_phone: "919000000021", ship_line1: "Elsewhere", ship_pincode: "110001" }, inviter));
  assert.ok(looksLikeInviter({ ship_phone: "919888888888", ship_line1: "flat 4 mg road", ship_pincode: "411001" }, inviter));
  assert.equal(looksLikeInviter({ ship_phone: "919888888888", ship_line1: "Flat 4, MG Road", ship_pincode: "411002" }, inviter), false);
});
