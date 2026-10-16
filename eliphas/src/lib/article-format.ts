// Article content: authors write a small, safe subset of Markdown; the server parses it into
// structured blocks, and pages render those blocks as React elements. No author HTML is ever
// rendered, links are limited to http(s), and everything here is pure (unit tested).
//
//   ## Heading      ### Smaller heading      > Quote
//   - item / * item (bulleted)      1. item (numbered)
//   **bold**   *italic*   [link text](https://example.com)
//   A blank line starts a new paragraph.

export type Inline = { t: "text"; v: string } | { t: "b"; c: Inline[] } | { t: "i"; c: Inline[] } | { t: "a"; href: string; c: Inline[] };
export type Block =
  | { t: "h2" | "h3" | "p" | "quote"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] };

export const VIEWS_NOTE = "Views count once per signed-in reader, or per browser, per article per day. They aren't the number of unique people.";

export const LIMITS = { title: 150, excerpt: 300, body: 40000, coverAlt: 200, tags: 5, tagLength: 30, minWords: 30 } as const;

export const TOPICS = [
  { value: "essay", label: "Essay" },
  { value: "reflection", label: "Personal reflection" },
  { value: "writing-advice", label: "Writing advice" },
  { value: "book-excerpt", label: "Book excerpt" },
  { value: "behind-the-book", label: "Behind the book" },
  { value: "other", label: "Other" },
] as const;
export type Topic = (typeof TOPICS)[number]["value"];
export const topicLabel = (t: string | null) => TOPICS.find((x) => x.value === t)?.label ?? "";

/** Only plain web links; anything else (javascript:, data:, relative paths) stays as text. */
export function safeUrl(raw: string): string | null {
  const v = raw.trim();
  if (v.length > 500 || !/^https?:\/\/[^\s<>"']+$/i.test(v)) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const PATTERNS: { re: RegExp; make: (m: RegExpExecArray, depth: number) => Inline | null }[] = [
  {
    re: /\[([^\]\n]{1,300})\]\(([^)\s]{1,500})\)/,
    make: (m, depth) => {
      const href = safeUrl(m[2]);
      return href ? { t: "a", href, c: parseInline(m[1], depth + 1, false) } : null;
    },
  },
  { re: /\*\*([^*\n](?:[^\n]*?[^*\n])?)\*\*/, make: (m, depth) => ({ t: "b", c: parseInline(m[1], depth + 1) }) },
  { re: /(?<![*\w])\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?![*\w])/, make: (m, depth) => ({ t: "i", c: parseInline(m[1], depth + 1) }) },
];

/** Bold, italic and links inside one line or paragraph. */
export function parseInline(text: string, depth = 0, links = true): Inline[] {
  if (!text) return [];
  if (depth > 4) return [{ t: "text", v: text }];
  let best: { index: number; m: RegExpExecArray; p: (typeof PATTERNS)[number] } | null = null;
  for (const p of PATTERNS) {
    if (!links && p === PATTERNS[0]) continue;
    const m = p.re.exec(text);
    if (m && (!best || m.index < best.index)) best = { index: m.index, m, p };
  }
  if (!best) return [{ t: "text", v: text }];
  const node = best.p.make(best.m, depth);
  const before = text.slice(0, best.index);
  const after = text.slice(best.index + best.m[0].length);
  const out: Inline[] = [];
  if (before) out.push({ t: "text", v: before });
  out.push(node ?? { t: "text", v: best.m[0] });
  return merge([...out, ...parseInline(after, depth, links)]);
}

function merge(nodes: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (n.t === "text" && last?.t === "text") last.v += n.v;
    else out.push(n);
  }
  return out;
}

/** Parses the author's text into blocks. Unknown syntax is kept as plain text. */
export function parseArticle(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").slice(0, LIMITS.body).split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: { t: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (para.length) blocks.push({ t: "p", c: parseInline(para.join(" ")) });
    if (quote.length) blocks.push({ t: "quote", c: parseInline(quote.join(" ")) });
    if (list) blocks.push({ t: list.t, items: list.items.map((i) => parseInline(i)) });
    para = [];
    quote = [];
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (!line) {
      flush();
    } else if ((m = /^(#{2,3})\s+(.+)$/.exec(line))) {
      flush();
      blocks.push({ t: m[1].length === 2 ? "h2" : "h3", c: parseInline(m[2]) });
    } else if ((m = /^#\s+(.+)$/.exec(line))) {
      flush();
      blocks.push({ t: "h2", c: parseInline(m[1]) }); // the article title is the only h1
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      if (para.length || list) flush();
      quote.push(m[1]);
    } else if ((m = /^[-*]\s+(.+)$/.exec(line))) {
      if (para.length || quote.length || (list && list.t !== "ul")) flush();
      list ??= { t: "ul", items: [] };
      list.items.push(m[1]);
    } else if ((m = /^\d{1,3}[.)]\s+(.+)$/.exec(line))) {
      if (para.length || quote.length || (list && list.t !== "ol")) flush();
      list ??= { t: "ol", items: [] };
      list.items.push(m[1]);
    } else {
      if (quote.length || list) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

const inlineText = (c: Inline[]): string => c.map((n) => (n.t === "text" ? n.v : inlineText(n.c))).join("");
export const blocksText = (blocks: Block[]) => blocks.map((b) => ("items" in b ? b.items.map(inlineText).join(" ") : inlineText(b.c))).join("\n");

export function wordCount(blocks: Block[]): number {
  return blocksText(blocks).split(/\s+/).filter(Boolean).length;
}

/** About 200 words a minute, at least one minute. */
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));

/** Readable URL part from an English title; Hindi-only titles use just the short id. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export const articlePath = (a: { short_id: string; slug: string }) => `/articles/${a.short_id}${a.slug ? `-${a.slug}` : ""}`;
/** The stable id at the start of an article URL ("ab12cd34-any-title" → "ab12cd34"). */
export const parseArticleRef = (ref: string) => (/^([a-f0-9]{8})(?:-|$)/.exec(ref)?.[1] ?? null);

/** Tags from a comma-separated field: trimmed, lowercased, unique, at most five, letters/numbers/spaces/hyphens. */
export function normalizeTags(raw: string): string[] | { error: string } {
  const tags = [...new Set(raw.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))];
  if (tags.length > LIMITS.tags) return { error: `Use up to ${LIMITS.tags} tags.` };
  for (const t of tags) {
    if (t.length > LIMITS.tagLength) return { error: `Keep each tag under ${LIMITS.tagLength} characters.` };
    if (!/^[\p{L}\p{M}\p{N} -]+$/u.test(t)) return { error: "Tags can use letters, numbers, spaces and hyphens." };
  }
  return tags;
}

export type ArticleDraft = {
  title: string;
  excerpt: string;
  language: string;
  topic: string | null;
  tags: string[];
  body_md: string;
  cover_path: string | null;
  cover_alt: string | null;
};

/** Problems that block publishing (a draft can be saved with any of these). */
export function publishProblems(a: ArticleDraft, rightsConfirmed: boolean): string[] {
  const p: string[] = [];
  if (!a.title.trim()) p.push("Add a title.");
  if (!a.excerpt.trim()) p.push("Add a short excerpt.");
  if (!TOPICS.some((t) => t.value === a.topic)) p.push("Choose a topic.");
  if (!["en", "hi"].includes(a.language)) p.push("Choose English or Hindi.");
  const words = wordCount(parseArticle(a.body_md));
  if (words < LIMITS.minWords) p.push(`Write at least ${LIMITS.minWords} words.`);
  if (a.cover_path && !a.cover_alt?.trim()) p.push("Describe the cover image (alt text) for readers using screen readers.");
  if (!rightsConfirmed) p.push("Confirm you own or have permission to publish the text and images.");
  return p;
}
