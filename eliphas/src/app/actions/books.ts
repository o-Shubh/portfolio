"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { estimateCopy, ruleFromPlanVersion } from "@/lib/commission";
import { authorRule, getCurrentPlans, termsRequirement } from "@/lib/plans";
import { gatewayPercent, printCost } from "@/lib/pricing";
import {
  COVER_TYPES,
  coverPath,
  GENRES,
  isEditable,
  makeSlug,
  manuscriptPath,
  printCoverPath,
  submitChecklist,
  type Book,
} from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Loads a book only if the logged-in author owns it. */
async function ownBook(bookId: string) {
  const profile = await requireRole(["author", "admin"]);
  const supabase = await createClient();
  const { data: book } = await supabase
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

  if (!title || title.length > 200) return { error: "Please enter a title (up to 200 characters)." };
  if (subtitle.length > 200) return { error: "Subtitle is too long." };
  if (!author_name || author_name.length > 120) return { error: "Please enter the author name as it appears on the cover." };
  if (language !== "en" && language !== "hi") return { error: "Please choose a language." };
  if (genre && !(GENRES as readonly string[]).includes(genre)) return { error: "Please choose a genre from the list." };
  if (description.length > 4000) return { error: "Description is too long (4000 characters max)." };
  if (isbn && !/^(97[89]\d{10}|\d{9}[\dX])$/.test(isbn)) return { error: "ISBN should be 13 digits (or 10 for older ISBNs)." };

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
  if (!isEditable(book)) return { error: LOCKED };

  if (kind === "manuscript") {
    if (input.path !== manuscriptPath(profile.id, bookId)) return { error: "Unexpected file location." };
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
    if (input.path !== printCoverPath(profile.id, bookId)) return { error: "Unexpected file location." };
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
    if (!ext || input.path !== coverPath(profile.id, bookId, ext)) return { error: "Unexpected file location." };
    // Remove the old cover if it had a different file type (cover.jpg -> cover.png)
    if (book.cover_path && book.cover_path !== input.path) {
      await supabase.storage.from("covers").remove([book.cover_path]);
    }
    const { error } = await supabase.from("books").update({ cover_path: input.path }).eq("id", bookId);
    if (error) return { error: "Could not save the file." };
  }

  refresh(bookId);
  return { ok: "Uploaded." };
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
  if (fd.get("next") === "1") redirect(`/author/books/${bookId}/submit`);
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

  const privateFiles = [book.manuscript_path, book.print_cover_path].filter((p): p is string => Boolean(p));
  if (privateFiles.length) await supabase.storage.from("manuscripts").remove(privateFiles);
  if (book.cover_path) await supabase.storage.from("covers").remove([book.cover_path]);
  // The sample bucket is written only by the server, so remove its file with the admin client
  if (book.sample_path) await createAdminClient().storage.from("book-samples").remove([book.sample_path]);
  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) return { error: "Could not delete. Please try again." };

  revalidatePath("/author", "layout");
  redirect("/author/books");
}
