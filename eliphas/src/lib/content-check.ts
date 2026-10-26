// The seven manuscript content checks. Pure functions (no imports from the app), unit tested directly.
// Input: the text of each page (from the PDF) plus the book's title and description. Output: one result per check.
// Checks never publish or reject a book: "fail" means the author must act (fix, add the 18+ label, or explain in a
// note to reviewers), "warn" means our reviewers look closely. Every result is shown to the author and the reviewer.

import { BUILT_IN_TERMS, type TermCategory } from "./content-terms.ts";

export type CheckKey = "readable" | "language" | "hate" | "adult" | "violence" | "personal" | "quality";
export type CheckStatus = "pass" | "warn" | "fail";
export type Example = { page: number; text: string }; // page 0 = book details (title, description)
export type CheckResult = { key: CheckKey; status: CheckStatus; count: number; detail: string; examples: Example[] };
export type Overall = "pass" | "review" | "blocked";

export const CHECKS: { key: CheckKey; title: string; what: string }[] = [
  { key: "readable", title: "Readable file", what: "We can read the text of your manuscript." },
  { key: "language", title: "Abusive language", what: "Swear words and vulgar language, in English, Hindi and Hinglish." },
  { key: "hate", title: "Hate speech", what: "Slurs against caste, religion, community, gender or disability." },
  { key: "adult", title: "Sexual content", what: "Sexually explicit words. Books with mature themes need the 18+ label." },
  { key: "violence", title: "Violence and self-harm", what: "Graphic violence, self-harm and instructions to cause harm." },
  { key: "personal", title: "Personal data", what: "Phone numbers, email addresses, Aadhaar and PAN numbers." },
  { key: "quality", title: "Professional quality", what: "Placeholder text, unfinished notes, shouting in capitals, spam links." },
];

export type ExtraTerms = Partial<Record<TermCategory | "allow", string[]>>;

const MAX_EXAMPLES = 5;
const norm = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "")
    .toLowerCase();
// Words: letters (any script), combining marks (Devanagari vowel signs) and digits; apostrophes join English words
const WORD = /[\p{L}\p{M}\p{N}']+/gu;

type Matcher = { exact: Set<string>; prefixes: string[]; phrases: string[][] };

function buildMatcher(terms: string[], allow: Set<string>): Matcher {
  const m: Matcher = { exact: new Set(), prefixes: [], phrases: [] };
  for (const raw of terms) {
    const t = norm(raw.trim());
    if (!t || allow.has(t)) continue;
    const parts = t.match(WORD) ?? [];
    if (parts.length > 1) m.phrases.push(parts);
    else if (t.endsWith("*") && parts[0]) m.prefixes.push(parts[0]);
    else if (parts[0]) m.exact.add(parts[0]);
  }
  m.phrases.sort((a, b) => b.length - a.length);
  return m;
}

/** Hides a matched word in an example, keeping its first letter ("f***"), so reports don't repeat the abuse. */
const mask = (w: string) => [...w][0] + "*".repeat(Math.max(2, [...w].length - 1));

/** A short piece of text around a match, with every match in it masked. */
function snippet(text: string, spans: [number, number][], at: number) {
  const [start, end] = spans[at];
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, end + 40);
  let out = "";
  let pos = from;
  for (const [s, e] of spans) {
    if (e <= from || s >= to) continue;
    const a = Math.max(s, from);
    out += text.slice(pos, a) + text.slice(a, Math.min(e, to)).split(/\s+/).map(mask).join(" ");
    pos = Math.min(e, to);
  }
  out += text.slice(pos, to);
  return `${from > 0 ? "…" : ""}${out}${to < text.length ? "…" : ""}`.replace(/\s+/g, " ").trim();
}

/** Finds whole-word and whole-phrase matches on one page. */
function findTerms(text: string, m: Matcher): { count: number; spans: [number, number][] } {
  const tokens: { w: string; start: number; end: number }[] = [];
  for (const match of text.matchAll(WORD)) tokens.push({ w: match[0].replace(/^'+|'+$/g, ""), start: match.index!, end: match.index! + match[0].length });
  const spans: [number, number][] = [];
  for (let i = 0; i < tokens.length; i++) {
    // Longest phrase first, so "how to make a bomb" counts once, not also as "make a bomb"
    const ph = m.phrases.find((p) => p.every((w, j) => tokens[i + j]?.w === w));
    if (ph) {
      spans.push([tokens[i].start, tokens[i + ph.length - 1].end]);
      i += ph.length - 1;
      continue;
    }
    const w = tokens[i].w;
    if (m.exact.has(w) || m.prefixes.some((p) => w.startsWith(p))) spans.push([tokens[i].start, tokens[i].end]);
  }
  return { count: spans.length, spans };
}

function termCheck(key: CheckKey, pages: string[], m: Matcher) {
  let count = 0;
  const examples: Example[] = [];
  pages.forEach((page, i) => {
    const text = norm(page);
    const { count: c, spans } = findTerms(text, m);
    count += c;
    spans.forEach((_, n) => examples.length < MAX_EXAMPLES && examples.push({ page: i, text: snippet(text, spans, n) }));
  });
  return { key, count, examples };
}

const PATTERNS = {
  phone: /(?:\+91[\s-]?|\b0)?\b[6-9]\d{4}[\s-]?\d{5}\b/g,
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
  aadhaar: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  url: /\bhttps?:\/\/\S+|\bwww\.\S+/gi,
  placeholder: /lorem ipsum|\[insert[^\]]*\]|\btodo\b|\btbd\b|\bxxx+\b|\[citation needed\]|\btext here\b/gi,
  shouting: /[!?]{4,}|(.)\1{6,}/g,
};

function patternExamples(pages: string[], re: RegExp, max = MAX_EXAMPLES, hide = true) {
  let count = 0;
  const examples: Example[] = [];
  pages.forEach((page, i) => {
    for (const m of page.matchAll(re)) {
      count++;
      if (examples.length < max) {
        const s = m.index!;
        const e = s + m[0].length;
        // Personal data: hide every number and ID-like code in the example, not just the match
        const hideAll = (t: string) =>
          hide ? t.replace(/\d{3,}|[A-Z]{5}\d{4}[A-Z]|[\w.+-]+@[\w-]+\.[\w.-]+/g, (x) => "•".repeat(Math.max(0, x.length - 2)) + x.slice(-2)) : t;
        examples.push({
          page: i,
          text: hideAll(`${page.slice(Math.max(0, s - 30), s)}${m[0]}${page.slice(e, e + 30)}`)
            .replace(/\s+/g, " ")
            .trim(),
        });
      }
    }
  });
  return { count, examples };
}

const words = (s: string) => (s.match(WORD) ?? []).length;

/**
 * Runs the seven checks. `pages[0]` should be the book details (title, subtitle, description); manuscript pages
 * follow (page 1 is the first PDF page). `pdfPages` is the PDF's page count.
 */
export function runChecks(pages: string[], pdfPages: number, extra: ExtraTerms = {}): { results: CheckResult[]; words: number; overall: Overall } {
  const allow = new Set((extra.allow ?? []).map((t) => norm(t.trim())));
  const manuscript = pages.slice(1);
  const totalWords = manuscript.reduce((a, p) => a + words(p), 0);
  const per1000 = (n: number) => (totalWords ? (n * 1000) / totalWords : n);
  const results: CheckResult[] = [];

  // 1. Readable: text found on most pages, and it looks like real words (old Hindi fonts come out as gibberish)
  const textPages = manuscript.filter((p) => words(p) >= 20).length;
  const allText = manuscript.join(" ");
  const nonSpace = allText.replace(/\s/g, "");
  const letters = (allText.match(/[\p{L}\p{M}]/gu) ?? []).length;
  const letterShare = nonSpace.length ? letters / nonSpace.length : 0;
  const mostlyImages = pdfPages > 0 && textPages < pdfPages * 0.5;
  results.push(
    pdfPages === 0
      ? { key: "readable", status: "fail", count: 0, detail: "We couldn't open this PDF. Export it again from your writing app and upload it.", examples: [] }
      : mostlyImages || letterShare < 0.6
        ? {
            key: "readable",
            status: "warn",
            count: textPages,
            detail: mostlyImages
              ? `We could read text on only ${textPages} of ${pdfPages} pages (scanned pages or pictures). Our reviewers will read it themselves, which may take longer.`
              : "The text looks garbled, which usually means an older Hindi font (like Kruti Dev). Please export with a Unicode font (like Mangal or Noto). Our reviewers will check it.",
            examples: [],
          }
        : {
            key: "readable",
            status: "pass",
            count: textPages,
            detail: `Text read on ${textPages} of ${pdfPages} pages (${totalWords.toLocaleString("en-IN")} words).`,
            examples: [],
          },
  );

  // 2–5. Word lists
  const lists = (c: TermCategory) => buildMatcher([...BUILT_IN_TERMS[c], ...(extra[c] ?? [])], allow);
  const language = termCheck("language", pages, lists("language"));
  const hate = termCheck("hate", pages, lists("hate"));
  const adult = termCheck("adult", pages, lists("adult"));
  const violence = termCheck("violence", pages, lists("violence"));
  const heavyLanguage = language.count >= 10 && per1000(language.count) >= 3;
  results.push({
    ...language,
    status: language.count === 0 ? "pass" : heavyLanguage ? "fail" : "warn",
    detail:
      language.count === 0
        ? "No abusive language found."
        : heavyLanguage
          ? `Found ${language.count} times. That's a lot for a general audience: tone it down, add the 18+ label, or explain why in your note to reviewers.`
          : `Found ${language.count} ${language.count === 1 ? "time" : "times"}. Fine in dialogue if it fits the story; our reviewers will see where.`,
  });
  results.push({
    ...hate,
    status: hate.count === 0 ? "pass" : "fail",
    detail:
      hate.count === 0
        ? "No slurs found."
        : `Found ${hate.count} ${hate.count === 1 ? "time" : "times"}. Remove them, or if the book shows prejudice in order to criticise it, explain this in your note to reviewers.`,
  });
  const explicit = adult.count >= 3;
  results.push({
    ...adult,
    status: adult.count === 0 ? "pass" : explicit ? "fail" : "warn",
    detail:
      adult.count === 0
        ? "No sexually explicit words found."
        : explicit
          ? `Found ${adult.count} times. The book needs the 18+ label. Sexually explicit material is not allowed even with the label.`
          : `Found ${adult.count} ${adult.count === 1 ? "time" : "times"}. Our reviewers will decide whether it needs the 18+ label.`,
  });
  const graphic = violence.count >= 5;
  results.push({
    ...violence,
    status: violence.count === 0 ? "pass" : graphic ? "fail" : "warn",
    detail:
      violence.count === 0
        ? "No graphic violence or self-harm found."
        : graphic
          ? `Found ${violence.count} times. Add the 18+ label or explain in your note to reviewers. Instructions for causing harm are never allowed.`
          : `Found ${violence.count} ${violence.count === 1 ? "time" : "times"}. Fine when the story needs it; our reviewers will see where.`,
  });

  // 6. Personal data: ID numbers must go; contact details are flagged
  const ids = [patternExamples(pages, PATTERNS.aadhaar), patternExamples(pages, PATTERNS.pan)];
  const contacts = [patternExamples(pages, PATTERNS.phone), patternExamples(pages, PATTERNS.email)];
  const idCount = ids.reduce((a, r) => a + r.count, 0);
  const contactCount = contacts.reduce((a, r) => a + r.count, 0);
  results.push({
    key: "personal",
    count: idCount + contactCount,
    status: idCount > 0 ? "fail" : contactCount > 0 ? "warn" : "pass",
    detail:
      idCount > 0
        ? "Looks like an Aadhaar or PAN number. Remove ID numbers from the book: anyone who buys it can read them."
        : contactCount > 0
          ? `${contactCount} phone ${contactCount === 1 ? "number or email address" : "numbers or email addresses"} found. Fine on an "About the author" page you chose to share; otherwise remove them.`
          : "No phone numbers, email addresses or ID numbers found.",
    examples: [...ids, ...contacts].flatMap((r) => r.examples).slice(0, MAX_EXAMPLES),
  });

  // 7. Professional quality
  const placeholders = patternExamples(pages, PATTERNS.placeholder, MAX_EXAMPLES, false);
  const shouting = patternExamples(pages, PATTERNS.shouting, MAX_EXAMPLES, false);
  const links = patternExamples(pages, PATTERNS.url, MAX_EXAMPLES, false);
  const latin = (allText.match(/[A-Za-z]/g) ?? []).length;
  const capsShare = latin > 500 ? (allText.match(/[A-Z]/g) ?? []).length / latin : 0;
  const tooShort = pdfPages >= 24 && totalWords < pdfPages * 30 && !mostlyImages;
  const problems: string[] = [];
  if (placeholders.count)
    problems.push(`${placeholders.count} placeholder or unfinished note${placeholders.count === 1 ? "" : "s"} (like "lorem ipsum" or "TODO")`);
  if (capsShare > 0.3) problems.push(`${Math.round(capsShare * 100)}% of the English text is in capitals`);
  if (shouting.count >= 20) problems.push(`${shouting.count} runs of repeated characters like "!!!!"`);
  if (links.count > 20) problems.push(`${links.count} web links`);
  if (tooShort) problems.push(`very little text for ${pdfPages} pages (${totalWords} words)`);
  results.push({
    key: "quality",
    count: problems.length,
    status: placeholders.count > 0 ? "fail" : problems.length ? "warn" : "pass",
    detail: problems.length
      ? `${problems.join("; ")}.${placeholders.count ? " Finish or remove these before sending it for review." : ""}`
      : "No placeholder text, shouting or spam links found.",
    examples: [...placeholders.examples, ...shouting.examples, ...links.examples].slice(0, MAX_EXAMPLES),
  });

  const overall: Overall = results.some((r) => r.status === "fail") ? "blocked" : results.some((r) => r.status === "warn") ? "review" : "pass";
  return { results, words: totalWords, overall };
}

/**
 * What still stops a book from being sent for review, given its latest check. A failed check is resolved by fixing
 * the manuscript (and checking again), by the 18+ label where that's the issue, or by a note to reviewers.
 */
export function submitBlockers(results: CheckResult[] | null, book: { ageRating: string; contentNote: string | null }): string[] {
  if (!results) return ["Run the content check on your manuscript"];
  const note = (book.contentNote ?? "").trim().length >= 20;
  const out: string[] = [];
  for (const r of results) {
    if (r.status !== "fail") continue;
    const title = CHECKS.find((c) => c.key === r.key)!.title;
    if (r.key === "readable") out.push(`${title}: upload the PDF again`);
    else if (r.key === "quality" || r.key === "personal") {
      // Usually a fix; a note covers a false alarm (e.g. a 12-digit number that isn't an Aadhaar)
      if (!note) out.push(`${title}: fix the manuscript and upload it again, or explain in a note to reviewers`);
    } else if (r.key === "adult") {
      if (book.ageRating !== "mature") out.push(`${title}: add the 18+ label`);
    } else if (r.key === "hate") {
      if (!note) out.push(`${title}: remove the slurs, or explain them in a note to reviewers`);
    } else if (book.ageRating !== "mature" && !note) out.push(`${title}: add the 18+ label or explain in a note to reviewers`);
  }
  return out;
}
