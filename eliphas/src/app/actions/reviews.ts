"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { isRestricted, overLimit } from "@/lib/articles";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewState = { error?: string; ok?: string; login?: boolean } | undefined;

/**
 * Adds or edits your review: one per reader per book. Any logged-in reader may review; "Verified purchase"
 * is shown separately, only when an order of the book was delivered to them. Authors can't review their own books.
 */
export async function saveReview(bookId: string, _prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Log in to review.", login: true };
  if (!me.full_name) return { error: "Add your name to your profile before reviewing." };
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
  const { data: existing } = await admin.from("book_reviews").select("id, moderation").eq("book_id", bookId).eq("user_id", me.id).maybeSingle();
  if (existing && existing.moderation === "removed") return { error: "Your review was removed by our team." };
  if (!existing && (await overLimit("book_reviews", "user_id", me.id, 10, 86400))) return { error: "You've posted 10 reviews today. Try again tomorrow." };
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
  if (!/^[0-9a-f-]{36}$/i.test(bookId)) return { error: "Book not found." };
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("slug").eq("id", bookId).maybeSingle();
  // Your own review only; a review our team removed stays as a record
  await admin.from("book_reviews").delete().eq("book_id", bookId).eq("user_id", me.id).neq("moderation", "removed");
  if (book) revalidatePath(`/books/${book.slug}`);
  return { ok: "Review deleted." };
}

/** The book's author may post one public response to a review (empty clears it). Authors can never delete reviews. */
export async function respondToReview(reviewId: string, _prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Log in first.", login: true };
  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) return { error: "Review not found." };
  const response = String(fd.get("response") ?? "").trim();
  if (response.length > 1000) return { error: "Keep your response under 1,000 characters." };
  const admin = createAdminClient();
  const { data: review } = await admin
    .from("book_reviews")
    .select("id, user_id, moderation, author_response, book:books!inner(id, slug, title, author_id)")
    .eq("id", reviewId)
    .maybeSingle();
  const book = review?.book as { id: string; slug: string; title: string; author_id: string } | undefined;
  if (!review || !book || review.moderation !== "visible") return { error: "Review not found." };
  if (book.author_id !== me.id) return { error: "Only the book's author can respond." };
  if (await isRestricted(me.id)) return { error: "Your account can't post right now." };
  const { error } = await admin
    .from("book_reviews")
    .update({ author_response: response || null, author_response_at: response ? new Date().toISOString() : null })
    .eq("id", reviewId);
  if (error) return { error: "Could not save your response. Try again." };
  await logAudit(me.id, response ? "review.responded" : "review.response_removed", "book_review", reviewId);
  if (response && !review.author_response) {
    await notify({ userId: review.user_id, kind: "reply", actorId: me.id, refId: reviewId, title: `The author of ${book.title} responded to your review`, link: `/books/${book.slug}#review-${reviewId}` });
  }
  revalidatePath(`/books/${book.slug}`);
  return { ok: response ? "Response posted." : "Response removed." };
}
