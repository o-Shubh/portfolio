import "server-only";
import { ratingSummary } from "@/lib/rating";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  user_id: string;
  name: string;
  verified: boolean;
  response: string | null;
  response_at: string | null;
};

/** Which of these users have received the book: an order with the book was delivered and not cancelled or refunded since. */
async function deliveredBuyers(bookId: string, userIds: string[]) {
  if (!userIds.length) return new Set<string>();
  const { data } = await createAdminClient()
    .from("order_items")
    .select("orders!inner(buyer_id, status)")
    .eq("book_id", bookId)
    .in("orders.buyer_id", userIds)
    .eq("orders.status", "delivered")
    .is("reversed_at", null);
  return new Set((data ?? []).map((r) => (r.orders as { buyer_id: string }).buyer_id));
}

/**
 * Published reviews for a book (newest first). "Verified purchase" is worked out from current order
 * status every time, so a cancellation or refund removes it. Reviewers' first names only.
 */
export async function listReviews(bookId: string) {
  const { data } = await createAdminClient()
    .from("book_reviews")
    .select("id, rating, body, created_at, edited_at, user_id, author_response, author_response_at, who:profiles!book_reviews_user_id_fkey(full_name)")
    .eq("book_id", bookId)
    .eq("moderation", "visible")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  const verified = await deliveredBuyers(bookId, rows.map((r) => r.user_id));
  const reviews: PublicReview[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    edited_at: r.edited_at,
    user_id: r.user_id,
    name: ((r.who as { full_name: string | null } | null)?.full_name ?? "Reader").split(" ")[0],
    verified: verified.has(r.user_id),
    response: r.author_response,
    response_at: r.author_response_at,
  }));
  return { reviews, ...ratingSummary(reviews.map((r) => r.rating)) };
}
