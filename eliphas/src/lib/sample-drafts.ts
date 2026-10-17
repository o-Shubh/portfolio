import "server-only";
import { PDFDocument } from "pdf-lib";
import { getCurrentProfile } from "@/lib/auth";
import { SAMPLE_BUCKET, SAMPLE_MAX_PAGES, sampleLimit } from "@/lib/book-sample";
import { createAdminClient } from "@/lib/supabase/admin";

// Samples are made in two steps: a private draft (manuscripts bucket, visible only to the author and
// our team), then the author previews and approves it and we copy it into the public sample bucket.
// Replacing the manuscript never touches an approved sample.

/** Uploads pass through the request proxy, which buffers at most 10 MB. */
export const SAMPLE_UPLOAD_MAX = 9 * 1024 * 1024;

const SAMPLE_COLS =
  "id, slug, title, author_id, page_count, status, published_at, manuscript_path, sample_path, sample_draft_path, sample_draft_from, sample_draft_to, sample_draft_source" as const;

export async function ownSampleBook(bookId: string) {
  const me = await getCurrentProfile();
  if (!me || !["author", "admin"].includes(me.role) || !/^[0-9a-f-]{36}$/i.test(bookId)) return null;
  const { data: book } = await createAdminClient().from("books").select(SAMPLE_COLS).eq("id", bookId).maybeSingle();
  return book && book.author_id === me.id ? { me, book } : null;
}
export type SampleBook = NonNullable<Awaited<ReturnType<typeof ownSampleBook>>>["book"];

/** A fresh PDF with only the given pages and none of the source's metadata. */
export async function cleanPdf(source: PDFDocument, pageIndexes: number[], title: string) {
  const out = await PDFDocument.create();
  (await out.copyPages(source, pageIndexes)).forEach((p) => out.addPage(p));
  out.setTitle(`${title}: free sample`);
  out.setAuthor("");
  out.setSubject("Free sample, Eliphas Indicus Publications");
  out.setKeywords([]);
  out.setProducer("Eliphas Indicus Publications");
  out.setCreator("Eliphas Indicus Publications");
  return out.save();
}

/** Checks an uploaded sample PDF and returns a cleaned copy. */
export async function checkUploadedSample(bytes: Uint8Array, book: SampleBook): Promise<{ error: string } | { data: Uint8Array; pages: number }> {
  if (bytes.byteLength > SAMPLE_UPLOAD_MAX) return { error: "The sample PDF must be 9 MB or smaller." };
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return { error: "Choose a PDF file." };
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    return { error: "We couldn't read that PDF. If it's password-protected, save an unprotected copy." };
  }
  const pages = source.getPageCount();
  const limit = book.page_count ? sampleLimit(book.page_count) : SAMPLE_MAX_PAGES;
  if (pages < 1) return { error: "That PDF has no pages." };
  if (pages > limit) return { error: `A sample can be up to ${limit} page${limit === 1 ? "" : "s"} (10% of your book, at most ${SAMPLE_MAX_PAGES}). This PDF has ${pages}.` };
  return { data: await cleanPdf(source, source.getPageIndices(), book.title), pages };
}

/** Stores a new private draft, replacing any earlier draft. The public sample is untouched. */
export async function storeDraft(book: SampleBook, bytes: Uint8Array, meta: { source: "pages" | "upload"; from: number | null; to: number | null }) {
  const admin = createAdminClient();
  const path = `${book.author_id}/${book.id}/sample-draft-${crypto.randomUUID()}.pdf`;
  const { error } = await admin.storage.from("manuscripts").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) return { error: "Could not save the draft. Try again." };
  await admin
    .from("books")
    .update({ sample_draft_path: path, sample_draft_source: meta.source, sample_draft_from: meta.from, sample_draft_to: meta.to })
    .eq("id", book.id);
  if (book.sample_draft_path) await admin.storage.from("manuscripts").remove([book.sample_draft_path]);
  return { ok: true as const };
}

/** A short-lived private link so the author can preview a draft. Never shown to readers. */
export async function draftPreviewUrl(path: string | null) {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from("manuscripts").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** Latest manuscript version number, to spot a sample made from an older manuscript. */
export async function latestManuscriptVersion(bookId: string) {
  const { data } = await createAdminClient()
    .from("book_file_versions")
    .select("version")
    .eq("book_id", bookId)
    .eq("kind", "manuscript")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.version ?? null;
}

export { SAMPLE_BUCKET };
