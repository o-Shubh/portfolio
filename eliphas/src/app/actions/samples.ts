"use server";

import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { requireRole } from "@/lib/auth";
import { checkSampleRange, SAMPLE_BUCKET } from "@/lib/book-sample";
import { createAdminClient } from "@/lib/supabase/admin";

export type SampleState = { error?: string; ok?: string } | undefined;

async function ownBook(bookId: string) {
  const profile = await requireRole(["author", "admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(bookId)) return null;
  const { data: book } = await createAdminClient()
    .from("books")
    .select("id, slug, title, author_id, manuscript_path, sample_path")
    .eq("id", bookId)
    .maybeSingle();
  return book && book.author_id === profile.id ? book : null;
}

const refresh = (b: { id: string; slug: string }) => {
  revalidatePath(`/author/books/${b.id}/sample`);
  revalidatePath(`/books/${b.slug}`);
};

/**
 * Copies the chosen pages (at most 10% of the book, up to 30) from the private manuscript into a new,
 * public sample PDF. Only those pages are copied; the manuscript itself is never made public.
 */
export async function setBookSample(_prev: SampleState, fd: FormData): Promise<SampleState> {
  const book = await ownBook(String(fd.get("book_id")));
  if (!book) return { error: "Book not found." };
  if (!book.manuscript_path) return { error: "Upload your manuscript PDF first (Files step)." };
  if (fd.get("rights") !== "on") return { error: "Confirm you're happy for these pages to be read free online." };
  const from = Number(fd.get("from"));
  const to = Number(fd.get("to"));

  const admin = createAdminClient();
  const { data: file, error: dlError } = await admin.storage.from("manuscripts").download(book.manuscript_path);
  if (dlError || !file) return { error: "We couldn't open your manuscript. Try again." };
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
  } catch {
    return { error: "We couldn't read your manuscript PDF." };
  }
  const problem = checkSampleRange(from, to, source.getPageCount());
  if (problem) return { error: problem };

  const sample = await PDFDocument.create();
  const pages = await sample.copyPages(source, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
  pages.forEach((p) => sample.addPage(p));
  sample.setTitle(`${book.title}: sample`);
  sample.setAuthor("");
  sample.setSubject("Free sample, Eliphas Indicus Publications");
  sample.setKeywords([]);
  sample.setProducer("Eliphas Indicus Publications");
  sample.setCreator("Eliphas Indicus Publications");
  const bytes = await sample.save();

  const path = `${book.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await admin.storage.from(SAMPLE_BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) return { error: "Could not save the sample. Try again." };
  await admin.from("books").update({ sample_path: path, sample_from: from, sample_to: to }).eq("id", book.id);
  if (book.sample_path) await admin.storage.from(SAMPLE_BUCKET).remove([book.sample_path]);
  refresh(book);
  return { ok: `Sample saved: pages ${from}–${to}.` };
}

/** Stops sharing a sample. */
export async function removeBookSample(_prev: SampleState, fd: FormData): Promise<SampleState> {
  const book = await ownBook(String(fd.get("book_id")));
  if (!book) return { error: "Book not found." };
  const admin = createAdminClient();
  if (book.sample_path) await admin.storage.from(SAMPLE_BUCKET).remove([book.sample_path]);
  await admin.from("books").update({ sample_path: null, sample_from: null, sample_to: null }).eq("id", book.id);
  refresh(book);
  return { ok: "Sample removed." };
}
