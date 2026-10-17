import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPublicOrigin, editionUrl, isEeid } from "./eeid-format.ts";

test("EEID format: year plus at least six digits", () => {
  assert.ok(isEeid("EEID-2026-000123"));
  assert.ok(isEeid("EEID-2027-1234567"), "grows beyond six digits");
  for (const bad of ["EEID-2026-12345", "eeid-2026-000123", "EEID-26-000123", "EEID-2026-000123/../x", "ISBN-978", "", null, "EEID-2026-" + "1".repeat(40)]) {
    assert.equal(isEeid(bad), false, String(bad));
  }
});

test("production origin must be an https domain with no path", () => {
  assert.deepEqual(checkPublicOrigin("https://books.example.in"), { ok: true, origin: "https://books.example.in" });
  assert.deepEqual(checkPublicOrigin("https://Books.Example.in/"), { ok: true, origin: "https://books.example.in" });
  for (const bad of [undefined, "", "books.example.in", "http://books.example.in", "https://localhost:3000", "https://127.0.0.1", "https://my-app-git-main.vercel.app", "https://abc.supabase.co", "https://example.in/shop", "https://example.in?x=1", "https://example.in:8443", "https://intranet"]) {
    assert.equal(checkPublicOrigin(bad).ok, false, String(bad));
  }
});

test("edition URL is the permanent /e/ route on the canonical origin", () => {
  assert.equal(editionUrl("https://books.example.in", "EEID-2026-000123"), "https://books.example.in/e/EEID-2026-000123");
  assert.equal(editionUrl("https://books.example.in/", "EEID-2026-000123"), "https://books.example.in/e/EEID-2026-000123");
});
