import "server-only";
import { runChecks, type CheckResult, type ExtraTerms } from "@/lib/content-check";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

type CheckRow = Database["public"]["Tables"]["manuscript_checks"]["Row"];

/** Text of each page of a PDF (empty strings for pages without text). Throws if the file can't be opened. */
async function pdfPages(data: Uint8Array): Promise<string[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  await doc.destroy();
  return pages;
}

/** Words our team added to the lists, or allowed (Admin → Content checks). */
async function extraTerms(): Promise<ExtraTerms> {
  const { data } = await createAdminClient().from("content_terms").select("term, category");
  const out: ExtraTerms = {};
  for (const t of data ?? []) (out[t.category as keyof ExtraTerms] ??= []).push(t.term);
  return out;
}

/** The latest check of the book's current manuscript, if there is one. */
export async function latestCheck(book: { id: string; manuscript_path: string | null }): Promise<CheckRow | null> {
  if (!book.manuscript_path) return null;
  const { data } = await createAdminClient()
    .from("manuscript_checks")
    .select("*")
    .eq("book_id", book.id)
    .eq("manuscript_path", book.manuscript_path)
    .maybeSingle();
  return data;
}

export const checkResults = (row: CheckRow | null) => (row ? (row.results as unknown as CheckResult[]) : null);

/** Runs the seven checks on the book's current manuscript (and its title and description) and stores the result. */
export async function runManuscriptCheck(bookId: string): Promise<CheckRow | { error: string }> {
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, title, subtitle, description, manuscript_path").eq("id", bookId).maybeSingle();
  if (!book?.manuscript_path) return { error: "Upload the manuscript first." };
  const details = [book.title, book.subtitle, book.description].filter(Boolean).join(". ");
  let pages: string[] = [];
  let failed: string | null = null;
  const { data: file, error } = await admin.storage.from("manuscripts").download(book.manuscript_path);
  if (error || !file) return { error: "Couldn't load the manuscript. Please try again." };
  try {
    pages = await pdfPages(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    failed = (e instanceof Error ? e.message : String(e)).slice(0, 500);
  }
  const { results, words, overall } = runChecks([details, ...pages], failed ? 0 : pages.length, await extraTerms());
  const { data: row, error: saveError } = await admin
    .from("manuscript_checks")
    .upsert(
      {
        book_id: book.id,
        manuscript_path: book.manuscript_path,
        status: failed ? "error" : "done",
        overall,
        results: results as unknown as Database["public"]["Tables"]["manuscript_checks"]["Insert"]["results"],
        pages: failed ? null : pages.length,
        words,
        error: failed,
        created_at: new Date().toISOString(),
      },
      { onConflict: "book_id,manuscript_path" },
    )
    .select("*")
    .single();
  if (saveError || !row) return { error: "Couldn't save the check. Please try again." };
  return row;
}
