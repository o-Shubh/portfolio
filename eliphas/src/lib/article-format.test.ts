import assert from "node:assert/strict";
import { test } from "node:test";
import {
  articlePath,
  normalizeTags,
  parseArticle,
  parseArticleRef,
  parseInline,
  publishProblems,
  readingMinutes,
  safeUrl,
  slugify,
  wordCount,
  type ArticleDraft,
} from "./article-format.ts";

test("blocks: headings, paragraphs, quotes and lists", () => {
  const md = "## Why I write\nFirst line\nsame paragraph.\n\n> A quote\n> continues\n\n- one\n- two\n\n1. first\n2. second\n\n### Small";
  assert.deepEqual(parseArticle(md), [
    { t: "h2", c: [{ t: "text", v: "Why I write" }] },
    { t: "p", c: [{ t: "text", v: "First line same paragraph." }] },
    { t: "quote", c: [{ t: "text", v: "A quote continues" }] },
    { t: "ul", items: [[{ t: "text", v: "one" }], [{ t: "text", v: "two" }]] },
    { t: "ol", items: [[{ t: "text", v: "first" }], [{ t: "text", v: "second" }]] },
    { t: "h3", c: [{ t: "text", v: "Small" }] },
  ]);
});

test("inline: bold, italic, links, nesting", () => {
  assert.deepEqual(parseInline("a **bold *both* text** and *it* [site](https://eliphas.in/x)"), [
    { t: "text", v: "a " },
    { t: "b", c: [{ t: "text", v: "bold " }, { t: "i", c: [{ t: "text", v: "both" }] }, { t: "text", v: " text" }] },
    { t: "text", v: " and " },
    { t: "i", c: [{ t: "text", v: "it" }] },
    { t: "text", v: " " },
    { t: "a", href: "https://eliphas.in/x", c: [{ t: "text", v: "site" }] },
  ]);
  assert.deepEqual(parseInline("2 * 3 * 4"), [{ t: "text", v: "2 * 3 * 4" }]);
});

test("XSS: HTML stays text and unsafe links are not links", () => {
  const blocks = parseArticle('<script>alert(1)</script>\n\n[click](javascript:alert(1)) [x](data:text/html,hi) <img src=x onerror=alert(1)>');
  assert.deepEqual(blocks[0], { t: "p", c: [{ t: "text", v: "<script>alert(1)</script>" }] });
  assert.ok(JSON.stringify(blocks[1]).indexOf('"t":"a"') === -1, "no link nodes for unsafe URLs");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("https://ok.example/a?b=1"), "https://ok.example/a?b=1");
  assert.equal(safeUrl("https://bad.example/\"onmouseover=x"), null);
  assert.equal(safeUrl("/relative"), null);
});

test("Hindi text, word count and reading time", () => {
  const blocks = parseArticle("## लेखन क्यों\nमैं हर सुबह लिखती हूँ।");
  assert.equal(blocks[0].t, "h2");
  assert.equal(wordCount(blocks), 7);
  assert.equal(readingMinutes(0), 1);
  assert.equal(readingMinutes(1000), 5);
});

test("URLs: stable id with a readable slug that can change", () => {
  assert.equal(slugify("Why I Write — Again!"), "why-i-write-again");
  assert.equal(slugify("लेखन क्यों"), "");
  assert.equal(articlePath({ short_id: "ab12cd34", slug: "why-i-write" }), "/articles/ab12cd34-why-i-write");
  assert.equal(articlePath({ short_id: "ab12cd34", slug: "" }), "/articles/ab12cd34");
  assert.equal(parseArticleRef("ab12cd34-old-title"), "ab12cd34");
  assert.equal(parseArticleRef("ab12cd34"), "ab12cd34");
  assert.equal(parseArticleRef("not-an-id"), null);
});

test("tags: normalised, at most five, safe characters", () => {
  assert.deepEqual(normalizeTags(" Writing, writing , Craft ,हिंदी साहित्य"), ["writing", "craft", "हिंदी साहित्य"]);
  assert.ok("error" in (normalizeTags("a,b,c,d,e,f") as object));
  assert.ok("error" in (normalizeTags("<b>") as object));
});

test("publish checks", () => {
  const ok: ArticleDraft = {
    title: "A title",
    excerpt: "Short",
    language: "en",
    topic: "essay",
    tags: [],
    body_md: Array(40).fill("word").join(" "),
    cover_path: null,
    cover_alt: null,
  };
  assert.deepEqual(publishProblems(ok, true), []);
  assert.equal(publishProblems(ok, false).length, 1);
  assert.ok(publishProblems({ ...ok, cover_path: "x.webp", cover_alt: "" }, true)[0].includes("alt text"));
  assert.equal(publishProblems({ ...ok, title: "", topic: null, body_md: "short" }, true).length, 3);
});
