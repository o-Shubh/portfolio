"use server";

import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { checkSampleRange, SAMPLE_BUCKET } from "@/lib/book-sample";
import { logAudit } from "@/lib/plans";
import { cleanPdf, latestManuscriptVersion, ownSampleBook, storeDraft } from "@/lib/sample-drafts";
import { createAdminClient } from "@/lib/supabase/admin";

export type SampleState = { error?: string; ok?: string } | undefined;

const refresh = (b: { id: string; slug: string }) => {
  revalidatePath(`/author/books/${b.id}/sample`);
  revalidatePath(`/author/books/${b.id}/submit`);
  revalidatePath(`/books/${b.slug}`);
  revalidatePath(`/books/${b.slug}/sample`);
};

/**
 * Copies the chosen pages (at most 10% of the book, up to 30) from the private manuscript into a private
 * draft. Nothing is public until the author previews and approves it.
 */
export async function draftSampleFromPages(_prev: SampleState, fd: FormData): Promise<SampleState> {
  const own = await ownSampleBook(String(fd.get("book_id")));
  if (!own) return { error: "Book not found." };
  const { book } = own;
  if (!book.manuscript_path) return { error: "Upload your manuscript PDF first (Files step)." };
  const from = Number(fd.get("from"));
  const to = Number(fd.get("to"));

  const { data: file, error: dlError } = await createAdminClient().storage.from("manuscripts").download(book.manuscript_path);
  if (dlError || !file) return { error: "We couldn't open your manuscript. Try again." };
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
  } catch {
    return { error: "We couldn't read your manuscript PDF." };
  }
  const problem = checkSampleRange(from, to, source.getPageCount());
  if (problem) return { error: problem };

  const bytes = await cleanPdf(source, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i), book.title);
  const res = await storeDraft(book, bytes, { source: "pages", from, to });
  if ("error" in res) return { error: res.error };
  refresh(book);
  return { ok: `Draft ready: pages ${from}–${to}. Check the preview, then approve it.` };
}

/** Publishes the previewed draft as the book's public sample (a separate copy; the draft stays private). */
export async function approveSample(_prev: SampleState, fd: FormData): Promise<SampleState> {
  const own = await ownSampleBook(String(fd.get("book_id")));
  if (!own) return { error: "Book not found." };
  const { book, me } = own;
  if (!book.sample_draft_path) return { error: "Make a draft sample first." };
  if (fd.get("rights") !== "on") return { error: "Confirm you're happy for these pages to be read free online." };

  const admin = createAdminClient();
  const { data: file, error: dlError } = await admin.storage.from("manuscripts").download(book.sample_draft_path);
  if (dlError || !file) return { error: "We couldn't open the draft. Make it again." };
  const path = `${book.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await admin.storage.from(SAMPLE_BUCKET).upload(path, await file.arrayBuffer(), { contentType: "application/pdf", upsert: false });
  if (error) return { error: "Could not publish the sample. Try again." };

  const version = book.sample_draft_source === "pages" ? await latestManuscriptVersion(book.id) : null;
  await admin
    .from("books")
    .update({
      sample_path: path,
      sample_from: book.sample_draft_from,
      sample_to: book.sample_draft_to,
      sample_source: book.sample_draft_source,
      sample_manuscript_version: version,
      sample_approved_at: new Date().toISOString(),
      sample_draft_path: null,
      sample_draft_from: null,
      sample_draft_to: null,
      sample_draft_source: null,
    })
    .eq("id", book.id);
  await admin.storage.from("manuscripts").remove([book.sample_draft_path]);
  if (book.sample_path) await admin.storage.from(SAMPLE_BUCKET).remove([book.sample_path]);
  await logAudit(me.id, "book.sample_approved", "book", book.id, { source: book.sample_draft_source, from: book.sample_draft_from, to: book.sample_draft_to });
  refresh(book);
  return { ok: book.published_at ? "Sample approved. Readers can open it from your book page." : "Sample approved. It goes live with your book." };
}

/** Throws away a draft. The public sample (if any) is unchanged. */
export async function discardSampleDraft(_prev: SampleState, fd: FormData): Promise<SampleState> {
  const own = await ownSampleBook(String(fd.get("book_id")));
  if (!own) return { error: "Book not found." };
  const { book } = own;
  const admin = createAdminClient();
  if (book.sample_draft_path) await admin.storage.from("manuscripts").remove([book.sample_draft_path]);
  await admin.from("books").update({ sample_draft_path: null, sample_draft_from: null, sample_draft_to: null, sample_draft_source: null }).eq("id", book.id);
  refresh(book);
  return { ok: "Draft discarded." };
}

/** Stops sharing a sample. The book page then shows "Sample coming soon". */
export async function removeBookSample(_prev: SampleState, fd: FormData): Promise<SampleState> {
  const own = await ownSampleBook(String(fd.get("book_id")));
  if (!own) return { error: "Book not found." };
  const { book, me } = own;
  const admin = createAdminClient();
  if (book.sample_path) await admin.storage.from(SAMPLE_BUCKET).remove([book.sample_path]);
  await admin
    .from("books")
    .update({ sample_path: null, sample_from: null, sample_to: null, sample_source: null, sample_manuscript_version: null, sample_approved_at: null })
    .eq("id", book.id);
  await logAudit(me.id, "book.sample_removed", "book", book.id);
  refresh(book);
  return { ok: "Sample removed." };
}
