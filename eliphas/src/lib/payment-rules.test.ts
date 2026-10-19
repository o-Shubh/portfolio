import test from "node:test";
import assert from "node:assert/strict";
import { captureDecision, mockAllowed } from "./payment-rules.ts";

test("test payments only on localhost, never on Vercel production or a hosted domain", () => {
  assert.equal(mockAllowed({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }), true);
  assert.equal(mockAllowed({ NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000" }), true);
  assert.equal(mockAllowed({ NEXT_PUBLIC_SITE_URL: "https://eliphas.in" }), false);
  assert.equal(mockAllowed({ NEXT_PUBLIC_SITE_URL: "https://eliphas.vercel.app" }), false);
  assert.equal(mockAllowed({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000", VERCEL_ENV: "production" }), false);
  assert.equal(mockAllowed({}), false);
  assert.equal(mockAllowed({ NEXT_PUBLIC_SITE_URL: "not a url" }), false);
});

const pay = (over: Partial<{ status: string; order_id: string; amount: number; fee: number | null }> = {}) => ({
  status: "captured",
  order_id: "order_1",
  amount: 29900,
  fee: 706,
  ...over,
});

test("only captured money for the right order and amount counts", () => {
  assert.deepEqual(captureDecision(pay(), "order_1", 29900), { state: "captured", fee: 706 });
  assert.deepEqual(captureDecision(pay({ status: "authorized" }), "order_1", 29900), { state: "pending" });
  assert.deepEqual(captureDecision(pay({ status: "created" }), "order_1", 29900), { state: "pending" });
  assert.equal(captureDecision(pay({ status: "failed" }), "order_1", 29900).state, "invalid");
  assert.equal(captureDecision(pay({ order_id: "order_2" }), "order_1", 29900).state, "invalid");
  assert.equal(captureDecision(pay({ amount: 100 }), "order_1", 29900).state, "invalid");
});

test("Razorpay unreachable means wait for the webhook, never approve", () => {
  assert.deepEqual(captureDecision(null, "order_1", 29900), { state: "pending" });
});
