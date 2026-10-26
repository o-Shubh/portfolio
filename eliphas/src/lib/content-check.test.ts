import test from "node:test";
import assert from "node:assert/strict";
import { runChecks, submitBlockers, type CheckKey } from "./content-check.ts";

const clean = "The monsoon arrived early that year, and the river rose over the old stone steps of the ghat. ".repeat(4);
const book = (...pages: string[]) => ["My Book. A story about a village.", ...pages];
const get = (r: ReturnType<typeof runChecks>, k: CheckKey) => r.results.find((x) => x.key === k)!;

test("a clean manuscript passes all seven checks", () => {
  const r = runChecks(book(clean, clean, clean), 3);
  assert.equal(r.results.length, 7);
  assert.equal(r.overall, "pass");
  assert.ok(r.results.every((x) => x.status === "pass"));
  assert.ok(r.words > 100);
});

test("whole words only: no false alarms inside other words", () => {
  const r = runChecks(book(`${clean} The class assessed the scunthorpe passage; the cocktail was dickensian. Shittake? No.`), 1);
  assert.equal(get(r, "language").status, "pass");
});

test("abusive language in English, Hindi and Hinglish is found and masked", () => {
  const r = runChecks(book(`${clean} "What the fuck," he said. Woh chutiya hai. वह हरामी है।`), 1);
  const l = get(r, "language");
  assert.equal(l.count, 3);
  assert.equal(l.status, "warn", "a few times in dialogue is a warning");
  assert.ok(
    l.examples.every((e) => !/fuck|chutiya|हरामी/.test(e.text)),
    "examples don't repeat the word",
  );
  assert.ok(l.examples[0].text.includes("f***"));
  assert.equal(l.examples[0].page, 1);
});

test("heavy abusive language fails", () => {
  const r = runChecks(book(`${"fuck shit bitch ".repeat(5)} ${clean}`), 1);
  assert.equal(get(r, "language").status, "fail");
  assert.equal(r.overall, "blocked");
});

test("slurs fail; phrases and prefixes match", () => {
  const r = runChecks(book(`${clean} They called him a katua.`), 1);
  assert.equal(get(r, "hate").status, "fail");
  const v = runChecks(book(`${clean} She learnt how to make a bomb.`), 1);
  assert.equal(get(v, "violence").count, 1);
  const a = runChecks(book(`${clean} masturbation masturbating erotica`), 1);
  assert.equal(get(a, "adult").count, 3);
  assert.equal(get(a, "adult").status, "fail");
});

test("book details are checked too (page 0)", () => {
  const r = runChecks(["Bhosdike stories", clean], 1);
  assert.equal(get(r, "language").examples[0].page, 0);
});

test("admin terms add to and allow from the lists", () => {
  const added = runChecks(book(`${clean} what a ghonchu`), 1, { language: ["ghonchu"] });
  assert.equal(get(added, "language").count, 1);
  const allowed = runChecks(book(`${clean} Chamar is the caste name used in this historical record.`), 1, { allow: ["chamar"] });
  assert.equal(get(allowed, "hate").status, "pass");
});

test("personal data: ID numbers fail, contact details warn", () => {
  const id = runChecks(book(`${clean} My Aadhaar is 2345 6789 0123 and PAN ABCDE1234F.`), 1);
  assert.equal(get(id, "personal").status, "fail");
  assert.ok(!get(id, "personal").examples.some((e) => e.text.includes("6789")), "ID digits are hidden");
  const contact = runChecks(book(`${clean} Write to me at author@example.in or call +91 98765 43210.`), 1);
  assert.equal(get(contact, "personal").status, "warn");
  assert.equal(get(contact, "personal").count, 2);
});

test("quality: placeholders fail; capitals, shouting, links and thin text warn", () => {
  assert.equal(get(runChecks(book(`${clean} Lorem ipsum dolor sit amet.`), 1), "quality").status, "fail");
  assert.equal(get(runChecks(book(`${clean} [Insert chapter 3 here]`), 1), "quality").status, "fail");
  const caps = runChecks(book(clean.toUpperCase().repeat(3)), 1);
  assert.equal(get(caps, "quality").status, "warn");
  const thin = runChecks(
    book(...Array(30).fill("Short page. Just a few words here on this page, nothing more at all, only enough to count as a page of text. ok")),
    30,
  );
  assert.equal(get(thin, "quality").status, "warn");
});

test("readable: unopenable PDF fails; scanned or garbled text warns", () => {
  assert.equal(get(runChecks(book(), 0), "readable").status, "fail");
  const scanned = runChecks(book(clean, "", "", ""), 4);
  assert.equal(get(scanned, "readable").status, "warn");
  const garbled = runChecks(book("¤¦§ ©ª« ¬®¯ °±² ³´µ ¶·¸ ¹º» ¼½¾ ".repeat(20)), 1);
  assert.equal(get(garbled, "readable").status, "warn");
});

test("submit rules: what a failed check needs", () => {
  assert.deepEqual(submitBlockers(null, { ageRating: "general", contentNote: null }), ["Run the content check on your manuscript"]);
  const adult = runChecks(book(`${clean} porn porn erotica`), 1).results;
  assert.equal(
    submitBlockers(adult, { ageRating: "general", contentNote: "This is a long explanation note." }).length,
    1,
    "a note doesn't replace the 18+ label",
  );
  assert.equal(submitBlockers(adult, { ageRating: "mature", contentNote: null }).length, 0);
  const hate = runChecks(book(`${clean} katua`), 1).results;
  assert.equal(submitBlockers(hate, { ageRating: "mature", contentNote: null }).length, 1, "18+ doesn't excuse slurs");
  assert.equal(submitBlockers(hate, { ageRating: "general", contentNote: "Quoted to show the prejudice the hero faces." }).length, 0);
  assert.equal(submitBlockers(hate, { ageRating: "general", contentNote: "short" }).length, 1, "the note must say something");
  const unreadable = runChecks(book(), 0).results;
  assert.equal(submitBlockers(unreadable, { ageRating: "mature", contentNote: "Please check it yourselves, thank you." }).length, 1);
  const warnOnly = runChecks(book(`${clean} fuck`), 1).results;
  assert.equal(submitBlockers(warnOnly, { ageRating: "general", contentNote: null }).length, 0, "warnings never block");
});
