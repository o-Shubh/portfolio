import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicReview = { id: string; rating: number; body: string | null; created_at: string; edited_at: string | null; user_id: string; name: string };

/** Visible reviews for a book (newest first) with an average. Reviewers' names only, never contact details. */
export async function listReviews(bookId: string) {
  const { data } = await createAdminClient()
    .from("book_reviews")
    .select("id, rating, body, created_at, edited_at, user_id, who:profiles!book_reviews_user_id_fkey(full_name)")
    .eq("book_id", bookId)
    .eq("moderation", "visible")
    .order("created_at", { ascending: false })
    .limit(100);
  const reviews: PublicReview[] = (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    edited_at: r.edited_at,
    user_id: r.user_id,
    name: ((r.who as { full_name: string | null } | null)?.full_name ?? "Reader").split(" ")[0],
  }));
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  return { reviews, average };
}

/** A reader may review a book only after an order containing it has been delivered to them. */
export async function hasDeliveredCopy(userId: string, bookId: string) {
  const { count } = await createAdminClient()
    .from("order_items")
    .select("id, orders!inner(buyer_id, status)", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("orders.buyer_id", userId)
    .eq("orders.status", "delivered")
    .is("reversed_at", null);
  return (count ?? 0) > 0;
}
