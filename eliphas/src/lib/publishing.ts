// Publishing rules shared by the browser and the server (no database calls here).
import type { Database } from "@/lib/database.types";
import { estimateCopy, type CommissionRule } from "@/lib/commission";
import { gatewayPercent, printCost, type PricingSettings, type PrintRates } from "@/lib/pricing";

export type Book = Database["public"]["Tables"]["books"]["Row"];
export type BookStatus = Database["public"]["Enums"]["book_status"];

export const GENRES = [
  "Fiction", "Stories", "Poetry", "Thriller", "Romance", "Children", "Memoir", "Biography",
  "Self-help", "Business", "Education", "History", "Religion & Spirituality", "Cooking", "Travel", "Other",
] as const;

export const STATUS: Record<BookStatus, { label: string; tone: string; help: string }> = {
  draft: { label: "Draft", tone: "bg-surface-2 text-fg", help: "Only you can see this book." },
  in_review: { label: "In review", tone: "bg-accent/20 text-fg", help: "Our team is checking your files." },
  changes_requested: { label: "Changes needed", tone: "bg-danger/15 text-danger", help: "See the note from our team." },
  published: { label: "Live", tone: "bg-success/15 text-success", help: "Readers can buy this book." },
  unpublished: { label: "Unpublished", tone: "bg-surface-2 text-muted", help: "Hidden from the bookstore." },
};

/** Authors can change details and files only in these states. */
export const EDITABLE: BookStatus[] = ["draft", "changes_requested", "unpublished"];
export const isEditable = (b: Pick<Book, "status">) => EDITABLE.includes(b.status);

/** "Monsoon Letters!" -> "monsoon-letters-k3x9qa". Hindi titles get "book-<random>". */
export function makeSlug(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "book"}-${suffix}`;
}

/**
 * Where files live in Storage. The first folder must be the author's id (security rule).
 * Every upload gets its own file name, so earlier versions are kept (see book_file_versions);
 * the fixed names below are the original single-file locations, still accepted for old books.
 */
export { isBookFilePath, versionedPath, type FileKind } from "./file-paths";
export const manuscriptPath = (authorId: string, bookId: string) => `${authorId}/${bookId}/manuscript.pdf`;
export const coverPath = (authorId: string, bookId: string, ext: string) => `${authorId}/${bookId}/cover.${ext}`;
export const printCoverPath = (authorId: string, bookId: string) => `${authorId}/${bookId}/print-cover.pdf`;
/** Front cover image types (shown in the bookstore) */
export const COVER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_MANUSCRIPT_MB = 50;
export const MAX_COVER_MB = 10; // front image and print cover PDF

/**
 * Does the PDF page size match the chosen book size? Allows for bleed
 * (up to 0.125 in extra on each side) and small rounding differences.
 */
export function pageSizeMatches(widthIn: number, heightIn: number, trim: { width_in?: number; height_in?: number }) {
  if (!trim.width_in || !trim.height_in) return true; // size unknown: don't warn
  const ok = (actual: number, target: number) => actual >= target - 0.06 && actual <= target + 0.31;
  return ok(widthIn, trim.width_in) && ok(heightIn, trim.height_in);
}

/**
 * Size the full print cover (back + spine + front, with bleed) should be.
 * Spine = pages × paper thickness. Null if the size or paper is unknown.
 */
export function fullCoverSize(
  b: { page_count: number | null; trim_size: string; paper: string },
  rates: PrintRates,
): { spineMm: number; widthIn: number; heightIn: number } | null {
  const trim = rates.trim_sizes[b.trim_size];
  const perPage = rates.paper[b.paper]?.spine_mm_per_page;
  if (!b.page_count || !trim?.width_in || !trim.height_in || !perPage) return null;
  const bleed = rates.cover_bleed_in ?? 0.125;
  const spineMm = Math.round(b.page_count * perPage * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    spineMm,
    widthIn: round2(trim.width_in * 2 + spineMm / 25.4 + bleed * 2),
    heightIn: round2(trim.height_in + bleed * 2),
  };
}

/** Is an uploaded print cover PDF close enough (±0.15 in) to the expected size? */
export function coverSizeMatches(w: number, h: number, expected: { widthIn: number; heightIn: number }) {
  return Math.abs(w - expected.widthIn) <= 0.15 && Math.abs(h - expected.heightIn) <= 0.15;
}

export type CheckItem = { ok: boolean; label: string; step: "details" | "files" | "print" | "sample" | "preview" };

/** Everything that must be done before a book can be sent for review. */
export function submitChecklist(
  book: Book,
  s: PricingSettings,
  rule: CommissionRule,
  terms?: { required: boolean; accepted: boolean },
): CheckItem[] {
  const cost =
    book.page_count && book.mrp !== null
      ? printCost(
          {
            page_count: book.page_count,
            trim_size: book.trim_size,
            binding: book.binding,
            interior: book.interior,
            paper: book.paper,
            cover_finish: book.cover_finish,
          },
          s.rates,
        )
      : null;
  const earning =
    cost !== null && book.mrp !== null
      ? estimateCopy(Number(book.mrp) * 100, cost * 100, rule, gatewayPercent(s.fees)).authorEarningPaise / 100
      : null;

  return [
    { ok: book.title.trim().length > 0, label: "Title", step: "details" },
    { ok: book.author_name.trim().length > 0, label: "Author name", step: "details" },
    { ok: (book.description ?? "").trim().length >= 50, label: "Description (at least 50 characters)", step: "details" },
    { ok: Boolean(book.genre), label: "Genre", step: "details" },
    { ok: Boolean(book.manuscript_path), label: "Manuscript PDF uploaded", step: "files" },
    { ok: Boolean(book.cover_path), label: "Front cover image uploaded", step: "files" },
    { ok: Boolean(book.print_cover_path), label: "Print cover PDF uploaded", step: "files" },
    {
      ok: Boolean(book.page_count && book.page_count >= s.rates.min_pages && book.page_count <= s.rates.max_pages),
      label: `Page count (${s.rates.min_pages}–${s.rates.max_pages})`,
      step: "print",
    },
    { ok: earning !== null && earning >= 1, label: "Price set, with earnings above ₹0", step: "print" },
    ...(terms?.required ? [{ ok: terms.accepted, label: "Author terms accepted", step: "print" as const }] : []),
    // New listings need an approved free sample; books already live keep selling while one is prepared
    ...(book.published_at ? [] : [{ ok: Boolean(book.sample_path && book.sample_approved_at), label: "Free sample approved", step: "sample" as const }]),
    { ok: Boolean(book.files_confirmed_at), label: "Files checked and confirmed in Preview", step: "preview" },
  ];
}
