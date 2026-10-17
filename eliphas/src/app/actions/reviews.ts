"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { isRestricted } from "@/lib/articles";
import { hasDeliveredCopy } from "@/lib/reviews";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewState = { error?: string; ok?: string; login?: boolean } | undefined;

/** Adds or edits your review. Only verified buyers (delivered order) can review, once per book. */
export async function saveReview(bookId: string, _prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Log in to review.", login: true };
  if (!/^[0-9a-f-]{36}$/i.test(bookId)) return { error: "Book not found." };
  const rating = Number(fd.get("rating"));
  const body = String(fd.get("body") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5 stars." };
  if (body.length > 1500) return { error: "Keep reviews under 1,500 characters." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id, slug, status, author_id").eq("id", bookId).maybeSingle();
  if (!book || book.status !== "published") return { error: "Book not found." };
  if (book.author_id === me.id) return { error: "You can't review your own book." };
  if (await isRestricted(me.id)) return { error: "Your account can't post reviews right now." };
  if (!(await hasDeliveredCopy(me.id, bookId))) return { error: "Reviews are open to readers whose copy has been delivered." };
  const { data: existing } = await admin.from("book_reviews").select("id, moderation").eq("book_id", bookId).eq("user_id", me.id).maybeSingle();
  if (existing && existing.moderation === "removed") return { error: "Your review was removed by our team." };
  const { error } = existing
    ? await admin.from("book_reviews").update({ rating, body: body || null, edited_at: new Date().toISOString() }).eq("id", existing.id)
    : await admin.from("book_reviews").insert({ book_id: bookId, user_id: me.id, rating, body: body || null });
  if (error) return { error: "Could not save your review. Please try again." };
  revalidatePath(`/books/${book.slug}`);
  return { ok: existing ? "Review updated." : "Thanks, your review is published." };
}

export async function deleteReview(bookId: string): Promise<ReviewState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Log in first.", login: true };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("slug").eq("id", bookId).maybeSingle();
  await admin.from("book_reviews").delete().eq("book_id", bookId).eq("user_id", me.id);
  if (book) revalidatePath(`/books/${book.slug}`);
  return { ok: "Review deleted." };
}
