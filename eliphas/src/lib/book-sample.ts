// "Read sample": an author shares a short run of pages from their own manuscript. Pure, unit tested.

export const SAMPLE_BUCKET = "book-samples";
export const SAMPLE_MAX_PAGES = 30;

/** At most 10% of the book, never more than 30 pages, at least one page. */
export const sampleLimit = (totalPages: number) => Math.min(SAMPLE_MAX_PAGES, Math.max(1, Math.floor(totalPages * 0.1)));

/** Checks a page range (1-based, inclusive) against the manuscript's length. */
export function checkSampleRange(from: number, to: number, totalPages: number): string | null {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return "Enter whole page numbers.";
  if (from < 1 || to < from) return "The last page must be the same as or after the first page.";
  if (to > totalPages) return `Your manuscript has ${totalPages} pages.`;
  const limit = sampleLimit(totalPages);
  if (to - from + 1 > limit) return `A sample can be up to ${limit} page${limit === 1 ? "" : "s"} (10% of your book, at most ${SAMPLE_MAX_PAGES}).`;
  return null;
}

export const sampleUrl = (path: string | null | undefined) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SAMPLE_BUCKET}/${path}` : null;
