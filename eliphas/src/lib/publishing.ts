// Publishing rules shared by the browser and the server (no database calls here).
import type { Database } from "@/lib/database.types";
import { earnings, printCost, type PricingSettings } from "@/lib/pricing";

export type Book = Database["public"]["Tables"]["books"]["Row"];
export type BookStatus = Database["public"]["Enums"]["book_status"];

export const GENRES = [
  "Fiction", "Stories", "Poetry", "Thriller", "Romance", "Children", "Memoir", "Biography",
  "Self-help", "Business", "Education", "History", "Religion & Spirituality", "Cooking", "Travel", "Other",
] as const;

export const STATUS: Record<BookStatus, { label: string; tone: string; help: string }> = {
  draft: { label: "Draft", tone: "bg-surface-2 text-fg", help: "Only you can see this book." },
  in_review: { label: "In review", tone: "bg-marigold/20 text-fg", help: "Our team is checking your files." },
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

/** Where files live in Storage. The first folder must be the author's id (security rule). */
export const manuscriptPath = (authorId: string, bookId: string) => `${authorId}/${bookId}/manuscript.pdf`;
export const coverPath = (authorId: string, bookId: string, ext: string) => `${authorId}/${bookId}/cover.${ext}`;
export const COVER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const MAX_MANUSCRIPT_MB = 50;
export const MAX_COVER_MB = 10;

/**
 * Does the PDF page size match the chosen book size? Allows for bleed
 * (up to 0.125 in extra on each side) and small rounding differences.
 */
export function pageSizeMatches(widthIn: number, heightIn: number, trim: { width_in?: number; height_in?: number }) {
  if (!trim.width_in || !trim.height_in) return true; // size unknown: don't warn
  const ok = (actual: number, target: number) => actual >= target - 0.06 && actual <= target + 0.31;
  return ok(widthIn, trim.width_in) && ok(heightIn, trim.height_in);
}

export type CheckItem = { ok: boolean; label: string; step: "details" | "files" | "print" };

/** Everything that must be done before a book can be sent for review. */
export function submitChecklist(book: Book, s: PricingSettings): CheckItem[] {
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
  const earning = cost !== null && book.mrp !== null ? earnings(Number(book.mrp), cost, s.fees).authorEarning : null;

  return [
    { ok: book.title.trim().length > 0, label: "Title", step: "details" },
    { ok: book.author_name.trim().length > 0, label: "Author name", step: "details" },
    { ok: (book.description ?? "").trim().length >= 50, label: "Description (at least 50 characters)", step: "details" },
    { ok: Boolean(book.genre), label: "Genre", step: "details" },
    { ok: Boolean(book.manuscript_path), label: "Manuscript PDF uploaded", step: "files" },
    { ok: Boolean(book.cover_path), label: "Cover uploaded", step: "files" },
    {
      ok: Boolean(book.page_count && book.page_count >= s.rates.min_pages && book.page_count <= s.rates.max_pages),
      label: `Page count (${s.rates.min_pages}–${s.rates.max_pages})`,
      step: "print",
    },
    { ok: earning !== null && earning >= 1, label: "Price set, with earnings above ₹0", step: "print" },
  ];
}
