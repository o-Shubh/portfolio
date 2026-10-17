"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { logAudit } from "@/lib/plans";
import { ensureEditionId } from "@/lib/editions";
import { createAdminClient } from "@/lib/supabase/admin";

// Eliphas Edition IDs and the final-files steps around them. Every action checks the admin role on the server.
export type EditionState = { error?: string; ok?: string; count?: number; titles?: string[] } | undefined;

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

const refreshBook = (id: string, slug?: string | null) => {
  revalidatePath(`/admin/books/${id}`);
  revalidatePath(`/author/books/${id}`, "layout");
  if (slug) revalidatePath(`/books/${slug}`);
};

/**
 * Approve, assign the EEID, and send the book back for final print files (e.g. to place the QR label on the
 * cover). Uses the existing "changes requested" status; when the author resubmits, "Approve and publish" keeps
 * the same EEID.
 */
export async function approveForFinalFiles(bookId: string, note: string): Promise<EditionState> {
  const me = await requireRole(["admin"]);
  if (!isId(bookId)) return { error: "Book not found." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, slug, status").eq("id", bookId).maybeSingle();
  if (!book) return { error: "Book not found." };
  if (book.status !== "in_review") return { error: "Only books waiting for review can be approved." };
  const assigned = await ensureEditionId(bookId, me.id);
  if ("error" in assigned) return { error: assigned.error };
  const clean = note.trim() || `Approved. Your Eliphas Edition ID is ${assigned.eeid}. Download the QR label from the Edition identity card, add it to your print cover (outside the barcode and safe area), upload the revised print cover and send the book for review again.`;
  if (clean.length > 2000) return { error: "Note is too long." };
  await admin
    .from("books")
    .update({ status: "changes_requested", review_note: clean, reviewed_at: new Date().toISOString(), reviewed_by: me.id })
    .eq("id", bookId);
  await logAudit(me.id, "edition.final_files_requested", "book", bookId, { eeid: assigned.eeid });
  refreshBook(bookId, book.slug);
  return { ok: `Approved with ${assigned.eeid}. The author has been asked for final print files.` };
}

/** Approves a revised print cover uploaded while the book is live: new orders print it from now on. */
export async function approveRevisedFiles(bookId: string): Promise<EditionState> {
  const me = await requireRole(["admin"]);
  if (!isId(bookId)) return { error: "Book not found." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, slug, status, manuscript_path, print_cover_path, cover_path, approved_files, print_review_requested_at").eq("id", bookId).maybeSingle();
  if (!book || !book.print_review_requested_at) return { error: "There are no revised files waiting for review." };
  const { data: versions } = await admin.from("book_file_versions").select("id, kind, version, path").eq("book_id", bookId);
  const pin = (kind: string, path: string | null) => {
    if (!path) return null;
    const v = (versions ?? []).find((x) => x.kind === kind && x.path === path);
    return { id: v?.id ?? null, version: v?.version ?? null, path };
  };
  const before = book.approved_files as Json;
  await admin
    .from("books")
    .update({
      approved_files: { manuscript: pin("manuscript", book.manuscript_path), print_cover: pin("print_cover", book.print_cover_path), cover: pin("cover", book.cover_path) },
      approved_files_at: new Date().toISOString(),
      print_review_requested_at: null,
    })
    .eq("id", bookId);
  await logAudit(me.id, "edition.revised_files_approved", "book", bookId, { before });
  refreshBook(bookId, book.slug);
  return { ok: "Revised files approved. New orders print them; orders already sent to a printer keep their files." };
}

/** Declines a revised print cover: the approved version stays in use (the revised file is kept as a version). */
export async function keepApprovedFiles(bookId: string, note: string): Promise<EditionState> {
  const me = await requireRole(["admin"]);
  if (!isId(bookId)) return { error: "Book not found." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, slug, approved_files, print_review_requested_at").eq("id", bookId).maybeSingle();
  if (!book || !book.print_review_requested_at) return { error: "There are no revised files waiting for review." };
  const af = (book.approved_files ?? {}) as { print_cover?: { path?: string } | null; manuscript?: { path?: string } | null };
  await admin
    .from("books")
    .update({
      ...(af.print_cover?.path ? { print_cover_path: af.print_cover.path } : {}),
      print_review_requested_at: null,
      review_note: note.trim() ? note.trim().slice(0, 2000) : null,
    })
    .eq("id", bookId);
  await logAudit(me.id, "edition.revised_files_declined", "book", bookId, { note: note.trim().slice(0, 500) });
  refreshBook(bookId, book.slug);
  return { ok: "Kept the approved files. The author can see your note." };
}

/** Takes an edition down (e.g. a legal request). Its EEID stays reserved and its public page becomes neutral. */
export async function removeEdition(bookId: string, reason: string): Promise<EditionState> {
  const me = await requireRole(["admin"]);
  if (!isId(bookId)) return { error: "Book not found." };
  const clean = reason.trim();
  if (clean.length < 5) return { error: "Give a reason (kept in the log, not shown publicly)." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, slug, status, removed_at").eq("id", bookId).maybeSingle();
  if (!book) return { error: "Book not found." };
  if (book.removed_at) return { error: "Already removed." };
  await admin
    .from("books")
    .update({ removed_at: new Date().toISOString(), removed_reason: clean.slice(0, 500), ...(book.status === "published" || book.status === "in_review" ? { status: "unpublished" as const } : {}) })
    .eq("id", bookId);
  await logAudit(me.id, "edition.removed", "book", bookId, { reason: clean.slice(0, 500) });
  refreshBook(bookId, book.slug);
  revalidatePath("/books");
  return { ok: "Removed. It's off the bookstore and its edition page shows a neutral notice." };
}

export async function restoreEdition(bookId: string): Promise<EditionState> {
  const me = await requireRole(["admin"]);
  if (!isId(bookId)) return { error: "Book not found." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, slug, removed_at").eq("id", bookId).maybeSingle();
  if (!book?.removed_at) return { error: "This edition isn't removed." };
  await admin.from("books").update({ removed_at: null, removed_reason: null }).eq("id", bookId);
  await logAudit(me.id, "edition.restored", "book", bookId);
  refreshBook(bookId, book.slug);
  return { ok: "Restored. It stays unpublished until it's approved again." };
}

/**
 * Gives an EEID to published editions that don't have one yet (books published before EEIDs existed).
 * Dry run first: it only counts. Idempotent: running it again skips books that already have an ID. The year in
 * each ID is the year it is actually assigned, not the book's original publication year.
 */
export async function backfillEditionIds(_prev: EditionState, fd: FormData): Promise<EditionState> {
  const me = await requireRole(["admin"]);
  const run = fd.get("mode") === "run";
  const admin = createAdminClient();
  const { data: missing } = await admin
    .from("books")
    .select("id, title")
    .eq("status", "published")
    .is("eeid", null)
    .is("removed_at", null)
    .order("published_at", { ascending: true })
    .limit(1000);
  const list = missing ?? [];
  if (!run) return { ok: `${list.length} published edition${list.length === 1 ? "" : "s"} without an Edition ID.`, count: list.length, titles: list.slice(0, 20).map((b) => b.title) };
  if (fd.get("confirm") !== "on") return { error: "Tick the box to confirm." };
  let done = 0;
  for (const b of list) {
    const r = await ensureEditionId(b.id, me.id, "backfill");
    if ("eeid" in r) done++;
  }
  await logAudit(me.id, "edition.backfill", "book", null, { assigned: done, candidates: list.length });
  revalidatePath("/admin/editions");
  return { ok: `Assigned ${done} Edition ID${done === 1 ? "" : "s"}.`, count: 0 };
}
