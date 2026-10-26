"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { estimateCopy, ruleFromPlanVersion } from "@/lib/commission";
import { authorRule, getCurrentPlans, termsRequirement } from "@/lib/plans";
import { gatewayPercent, printCost } from "@/lib/pricing";
import { COVER_TYPES, GENRES, isBookFilePath, isEditable, makeSlug, submitChecklist, type Book } from "@/lib/publishing";
import { submitBlockers } from "@/lib/content-check";
import { checkResults, latestCheck } from "@/lib/manuscript-check";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Loads a book only if the logged-in author owns it. */
async function ownBook(bookId: string) {
  const profile = await requireRole(["author", "admin"]);
  const supabase = await createClient();
  // Full row (incl. private file paths) is read on the server; the author_id filter is the ownership check
  const { data: book } = await createAdminClient()
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("author_id", profile.id)
    .maybeSingle();
  return { profile, supabase, book };
}

function refresh(bookId: string) {
  revalidatePath("/author", "layout");
  revalidatePath(`/author/books/${bookId}`, "layout");
}

const LOCKED = "This book can't be edited right now. Withdraw it from review or unpublish it first.";

// ---------------------------------------------------------------------------

export async function createBook(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(["author", "admin"]);
  const title = text(fd, "title");
  const language = text(fd, "language");
  if (title.length < 1 || title.length > 200) return { error: "Please enter the book title." };
  if (language !== "en" && language !== "hi") return { error: "Please choose a language." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .insert({
      author_id: profile.id,
      title,
      language,
      author_name: profile.full_name ?? "",
      slug: makeSlug(title),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not create the book. Please try again." };

  revalidatePath("/author", "layout");
  redirect(`/author/books/${data.id}/details`);
}

export async function saveDetails(bookId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, book } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  if (!isEditable(book)) return { error: LOCKED };

  const title = text(fd, "title");
  const subtitle = text(fd, "subtitle");
  const author_name = text(fd, "author_name");
  const language = text(fd, "language");
  const genre = text(fd, "genre");
  const description = text(fd, "description");
  const isbn = text(fd, "isbn").replace(/[-\s]/g, "");
  const edition_label = text(fd, "edition_label");
  const editionOf = text(fd, "edition_of");

  if (!title || title.length > 200) return { error: "Please enter a title (up to 200 characters)." };
  if (subtitle.length > 200) return { error: "Subtitle is too long." };
  if (!author_name || author_name.length > 120) return { error: "Please enter the author name as it appears on the cover." };
  if (language !== "en" && language !== "hi") return { error: "Please choose a language." };
  if (genre && !(GENRES as readonly string[]).includes(genre)) return { error: "Please choose a genre from the list." };
  if (description.length > 4000) return { error: "Description is too long (4000 characters max)." };
  if (isbn && !/^(97[89]\d{10}|\d{9}[\dX])$/.test(isbn)) return { error: "ISBN should be 13 digits (or 10 for older ISBNs)." };
  if (edition_label.length > 60) return { error: "Edition is too long (60 characters max)." };
  // Link to another of the author's own books (same work); unlinking gives this edition its own work
  let work_id: string | undefined;
  if (fd.has("edition_of")) {
    if (editionOf) {
      const { data: other } = await createAdminClient().from("books").select("work_id, author_id").eq("id", /^[0-9a-f-]{36}$/i.test(editionOf) ? editionOf : "00000000-0000-0000-0000-000000000000").maybeSingle();
      if (!other || other.author_id !== book.author_id) return { error: "Choose one of your own books." };
      work_id = other.work_id;
    } else {
      const { count } = await createAdminClient().from("books").select("id", { count: "exact", head: true }).eq("work_id", book.work_id).neq("id", book.id);
      if (count) work_id = crypto.randomUUID();
    }
  }

  const { error } = await supabase
    .from("books")
    .update({
      title,
      subtitle: subtitle || null,
      author_name,
      language,
      genre: genre || null,
      description: description || null,
      isbn: isbn || null,
      edition_label: edition_label || null,
      ...(work_id ? { work_id } : {}),
      // Keep the web address in step with the title until the book has been published once
      ...(book.published_at === null && title !== book.title ? { slug: makeSlug(title) } : {}),
    })
    .eq("id", bookId);
  if (error) return { error: "Could not save. Please try again." };

  refresh(bookId);
  if (fd.get("next") === "1") redirect(`/author/books/${bookId}/files`);
  return { ok: "Saved." };
}

/**
 * Called by the browser after it uploads a file straight to Supabase Storage.
 * We check the path is the expected one for this author and book before saving it.
 */
export async function attachFile(
  bookId: string,
  kind: "manuscript" | "cover" | "print_cover",
  input: { path: string; mime?: string; pageCount?: number; widthIn?: number; heightIn?: number },
): Promise<ActionState> {
  const { profile, supabase, book } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  // A live book may take a revised print cover (e.g. with its EEID label). It is held for print review;
  // orders keep printing the approved cover until our team approves the new one.
  const liveRevision = kind === "print_cover" && book.status === "published" && !book.removed_at;
  if (!isEditable(book) && !liveRevision) return { error: LOCKED };

  if (liveRevision) {
    if (!isBookFilePath(input.path, profile.id, bookId, "print_cover", "pdf")) return { error: "Unexpected file location." };
    const admin = createAdminClient();
    // Books approved before file pinning: pin what's approved now, so the revision can't reach orders unreviewed
    const af = (book.approved_files ?? {}) as { print_cover?: { path?: string } | null };
    const pins = af.print_cover?.path
      ? {}
      : { approved_files: { ...(book.approved_files as object | null ?? {}), manuscript: book.manuscript_path ? { id: null, version: null, path: book.manuscript_path } : null, print_cover: book.print_cover_path ? { id: null, version: null, path: book.print_cover_path } : null, cover: book.cover_path ? { id: null, version: null, path: book.cover_path } : null }, approved_files_at: book.approved_files_at ?? new Date().toISOString() };
    const size = (n?: number) => (typeof n === "number" && n > 0 && n < 100 ? Math.round(n * 100) / 100 : null);
    const { error } = await admin
      .from("books")
      .update({ ...pins, print_cover_path: input.path, print_cover_width_in: size(input.widthIn), print_cover_height_in: size(input.heightIn), print_review_requested_at: new Date().toISOString() })
      .eq("id", bookId)
      .eq("author_id", profile.id);
    if (error) return { error: "Could not save the file." };
  } else if (kind === "manuscript") {
    if (!isBookFilePath(input.path, profile.id, bookId, "manuscript", "pdf")) return { error: "Unexpected file location." };
    const pages = Number.isInteger(input.pageCount) && input.pageCount! > 0 ? input.pageCount! : null;
    const size = (n?: number) => (typeof n === "number" && n > 0 && n < 100 ? Math.round(n * 100) / 100 : null);
    const { error } = await supabase
      .from("books")
      .update({
        manuscript_path: input.path,
        manuscript_width_in: size(input.widthIn),
        manuscript_height_in: size(input.heightIn),
        // Fill in the page count from the PDF; the author can still change it.
        ...(pages ? { page_count: pages } : {}),
      })
      .eq("id", bookId);
    if (error) return { error: error.message.includes("page_count") ? "The page count of this PDF isn't supported." : "Could not save the file." };
  } else if (kind === "print_cover") {
    if (!isBookFilePath(input.path, profile.id, bookId, "print_cover", "pdf")) return { error: "Unexpected file location." };
    const size = (n?: number) => (typeof n === "number" && n > 0 && n < 100 ? Math.round(n * 100) / 100 : null);
    const { error } = await supabase
      .from("books")
      .update({
        print_cover_path: input.path,
        print_cover_width_in: size(input.widthIn),
        print_cover_height_in: size(input.heightIn),
      })
      .eq("id", bookId);
    if (error) return { error: "Could not save the file." };
  } else {
    const ext = input.mime ? COVER_TYPES[input.mime] : undefined;
    if (!ext || !isBookFilePath(input.path, profile.id, bookId, "cover", ext)) return { error: "Unexpected file location." };
    const { error } = await supabase.from("books").update({ cover_path: input.path }).eq("id", bookId);
    if (error) return { error: "Could not save the file." };
  }

  // Keep this upload as a new version (earlier files stay available), and ask the author to check the files again
  const admin = createAdminClient();
  const { data: last } = await admin.from("book_file_versions").select("version").eq("book_id", bookId).eq("kind", kind).order("version", { ascending: false }).limit(1).maybeSingle();
  const pages = kind === "manuscript" && Number.isInteger(input.pageCount) && input.pageCount! > 0 ? input.pageCount! : null;
  await admin.from("book_file_versions").insert({
    book_id: bookId,
    kind,
    version: (last?.version ?? 0) + 1,
    path: input.path,
    page_count: pages,
    width_in: typeof input.widthIn === "number" && input.widthIn > 0 && input.widthIn < 100 ? Math.round(input.widthIn * 100) / 100 : null,
    height_in: typeof input.heightIn === "number" && input.heightIn > 0 && input.heightIn < 100 ? Math.round(input.heightIn * 100) / 100 : null,
    uploaded_by: profile.id,
  });
  if (!liveRevision) await admin.from("books").update({ files_confirmed_at: null }).eq("id", bookId);

  refresh(bookId);
  return { ok: liveRevision ? "Uploaded. Our team checks it before it's printed; orders use the approved cover until then." : "Uploaded." };
}

export async function savePrintOptions(bookId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, book, profile } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  if (!isEditable(book)) return { error: LOCKED };

  const { rates, fees } = await getPricingSettings();
  const opts = {
    page_count: Number(fd.get("page_count")),
    trim_size: text(fd, "trim_size"),
    binding: text(fd, "binding"),
    interior: text(fd, "interior"),
    paper: text(fd, "paper"),
    cover_finish: text(fd, "cover_finish"),
  };
  const mrp = Number(fd.get("mrp"));

  if (!Number.isInteger(opts.page_count) || opts.page_count < rates.min_pages || opts.page_count > rates.max_pages) {
    return { error: `Page count must be between ${rates.min_pages} and ${rates.max_pages}.` };
  }
  // Server recalculates the cost; the browser's numbers are never trusted.
  const cost = printCost(opts, rates);
  if (cost === null) return { error: "Please choose a valid option for every print setting." };
  if (!Number.isInteger(mrp) || mrp < 1 || mrp > 99999) return { error: "MRP must be a whole number of rupees." };
  // Negative-earnings guard, using the author's own commission rule (Free for a new book that needs the current terms)
  const rule = termsRequirement(book, profile).required ? ruleFromPlanVersion((await getCurrentPlans()).free) : (await authorRule(book.author_id)).rule;
  const e = estimateCopy(mrp * 100, cost * 100, rule, gatewayPercent(fees));
  if (e.authorEarningPaise < 100) return { error: "At this price you would not earn anything. Please raise the price." };

  const { error } = await supabase
    .from("books")
    .update({ ...opts, mrp, print_cost: cost })
    .eq("id", bookId);
  if (error) return { error: "Could not save. Please try again." };

  refresh(bookId);
  if (fd.get("next") === "1") redirect(`/author/books/${bookId}/sample`);
  return { ok: "Saved." };
}

export async function submitForReview(bookId: string): Promise<ActionState> {
  const { supabase, book } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  if (!["draft", "changes_requested", "unpublished"].includes(book.status)) return { error: "This book is already submitted." };

  const settings = await getPricingSettings();
  const { profile } = await ownBook(bookId);
  const { rule } = await authorRule(book.author_id);
  const missing = submitChecklist(book as Book, settings, rule, termsRequirement(book, profile)).filter((c) => !c.ok);
  if (missing.length) return { error: `Still to do: ${missing.map((m) => m.label).join(", ")}.` };
  // The seven content checks on the current manuscript
  const blockers = submitBlockers(checkResults(await latestCheck(book)), { contentNote: book.content_note });
  if (blockers.length) return { error: `Content check: ${blockers.join("; ")}.` };

  // Re-snapshot the print cost with today's rates
  const cost = printCost(
    {
      page_count: book.page_count!,
      trim_size: book.trim_size,
      binding: book.binding,
      interior: book.interior,
      paper: book.paper,
      cover_finish: book.cover_finish,
    },
    settings.rates,
  );
  const { error } = await supabase
    .from("books")
    .update({ status: "in_review", submitted_at: new Date().toISOString(), print_cost: cost })
    .eq("id", bookId);
  if (error) return { error: "Could not submit. Please try again." };

  refresh(bookId);
  return { ok: "Sent for review." };
}

/** The note to reviewers about flagged content (while the book can be edited). */
export async function saveContentSettings(bookId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { book } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  if (!isEditable(book)) return { error: "The book can't be changed while it's in review or live." };
  const note = String(fd.get("content_note") ?? "").trim();
  if (note.length > 1000) return { error: "Keep the note under 1,000 characters." };
  const { error } = await createAdminClient().from("books").update({ content_note: note || null }).eq("id", bookId);
  if (error) return { error: "Could not save. Please try again." };
  refresh(bookId);
  return { ok: "Saved." };
}

export async function withdrawFromReview(bookId: string): Promise<ActionState> {
  const { supabase, book } = await ownBook(bookId);
  if (!book || book.status !== "in_review") return { error: "This book is not in review." };
  const { error } = await supabase.from("books").update({ status: "draft" }).eq("id", bookId);
  if (error) return { error: "Could not withdraw. Please try again." };
  refresh(bookId);
  return { ok: "Withdrawn. You can edit the book again." };
}

export async function unpublishBook(bookId: string): Promise<ActionState> {
  const { supabase, book } = await ownBook(bookId);
  if (!book || book.status !== "published") return { error: "This book is not live." };
  const { error } = await supabase.from("books").update({ status: "unpublished" }).eq("id", bookId);
  if (error) return { error: "Could not unpublish. Please try again." };
  refresh(bookId);
  revalidatePath("/books", "layout");
  return { ok: "Unpublished. It is hidden from the bookstore." };
}

export async function deleteDraft(bookId: string): Promise<ActionState> {
  const { supabase, book } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  if (book.status !== "draft") return { error: "Only drafts can be deleted." };

  const { data: versions } = await createAdminClient().from("book_file_versions").select("kind, path").eq("book_id", bookId);
  const privateFiles = [...new Set([book.manuscript_path, book.print_cover_path, ...(versions ?? []).filter((v) => v.kind !== "cover").map((v) => v.path)])].filter((p): p is string => Boolean(p));
  const coverFiles = [...new Set([book.cover_path, ...(versions ?? []).filter((v) => v.kind === "cover").map((v) => v.path)])].filter((p): p is string => Boolean(p));
  if (privateFiles.length) await supabase.storage.from("manuscripts").remove(privateFiles);
  if (coverFiles.length) await supabase.storage.from("covers").remove(coverFiles);
  // The sample bucket is written only by the server, so remove its file with the admin client
  if (book.sample_path) await createAdminClient().storage.from("book-samples").remove([book.sample_path]);
  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) return { error: "Could not delete. Please try again." };

  revalidatePath("/author", "layout");
  redirect("/author/books");
}

/**
 * The author confirms, on the Preview step, that the current files are the ones to submit.
 * Uploading any file again clears this, so the confirmation always matches the files sent for review.
 */
export async function confirmFiles(bookId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, book } = await ownBook(bookId);
  if (!book) return { error: "Book not found." };
  if (!isEditable(book)) return { error: LOCKED };
  if (!book.manuscript_path || !book.print_cover_path || !book.cover_path) return { error: "Upload the manuscript, print cover and front cover image first." };
  if (fd.get("confirm") !== "on") return { error: "Tick the box to confirm you've checked your files." };
  const { error } = await supabase.from("books").update({ files_confirmed_at: new Date().toISOString() }).eq("id", bookId);
  if (error) return { error: "Could not save. Please try again." };
  refresh(bookId);
  if (fd.get("next") === "1") redirect(`/author/books/${bookId}/submit`);
  return { ok: "Files confirmed." };
}
