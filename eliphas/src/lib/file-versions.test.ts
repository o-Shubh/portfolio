import assert from "node:assert/strict";
import { test } from "node:test";
import { isBookFilePath, versionedPath } from "./file-paths.ts";

const A = "00000000-0000-4000-a000-000000000011";
const B = "11111111-2222-4333-8444-555555555555";

test("each upload gets its own versioned file name in the author's book folder", () => {
  const p = versionedPath(A, B, "manuscript", "pdf");
  assert.match(p, new RegExp(`^${A}/${B}/manuscript-[0-9a-f-]{36}\\.pdf$`));
  assert.notEqual(p, versionedPath(A, B, "manuscript", "pdf"));
  assert.match(versionedPath(A, B, "print_cover", "pdf"), /\/print-cover-[0-9a-f-]{36}\.pdf$/);
});

test("only this author's book folder and the right kind of file are accepted", () => {
  assert.ok(isBookFilePath(versionedPath(A, B, "manuscript", "pdf"), A, B, "manuscript", "pdf"));
  assert.ok(isBookFilePath(`${A}/${B}/manuscript.pdf`, A, B, "manuscript", "pdf")); // older single-file books
  assert.ok(isBookFilePath(versionedPath(A, B, "cover", "webp"), A, B, "cover", "webp"));
  assert.ok(!isBookFilePath(versionedPath(A, B, "cover", "webp"), A, B, "manuscript", "pdf"));
  assert.ok(!isBookFilePath(`${B}/${B}/manuscript.pdf`, A, B, "manuscript", "pdf")); // someone else's folder
  assert.ok(!isBookFilePath(`${A}/${B}/../x/manuscript.pdf`, A, B, "manuscript", "pdf"));
  assert.ok(!isBookFilePath(`${A}/${B}/manuscript-evil.pdf`, A, B, "manuscript", "pdf"));
});
