import { Star } from "lucide-react";
import Link from "next/link";
import type { PublicReview } from "@/lib/reviews";
import { ReviewForm } from "./ReviewForm";
import { ReviewReport } from "./ReviewReport";

const Stars = ({ value, label }: { value: number; label: string }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`h-4 w-4 ${n <= Math.round(value) ? "fill-marigold text-marigold" : "text-line-strong"}`} aria-hidden />
    ))}
  </span>
);

/** Reviews from readers whose copy was delivered. Nothing is shown when there are none: no invented ratings. */
export function BookReviews({
  bookId,
  slug,
  reviews,
  average,
  me,
  canReview,
  mine,
}: {
  bookId: string;
  slug: string;
  reviews: PublicReview[];
  average: number | null;
  me: string | null;
  canReview: boolean;
  mine: { rating: number; body: string } | null;
}) {
  return (
    <section className="card" aria-labelledby="reviews-h" id="reviews">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reviews-h" className="text-lg">
          Reader reviews
        </h2>
        {average !== null && (
          <p className="flex items-center gap-2 text-sm">
            <Stars value={average} label={`Average ${average.toFixed(1)} out of 5`} />
            <span className="tabular-nums text-muted">
              {average.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Only readers whose copy was delivered can review.</p>

      {reviews.length === 0 ? (
        <p className="mt-4 text-muted">No reviews yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {reviews.map((r) => (
            <li key={r.id} className="py-3" data-testid="review">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Stars value={r.rating} label={`${r.rating} out of 5`} />
                <span className="font-semibold">{r.name}</span>
                <span className="text-muted">
                  · Verified purchase · {new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                  {r.edited_at && " · edited"}
                </span>
              </p>
              {r.body && <p className="mt-1 whitespace-pre-line">{r.body}</p>}
              {me && me !== r.user_id && <ReviewReport reviewId={r.id} />}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {canReview ? (
          <ReviewForm bookId={bookId} initial={mine} />
        ) : me ? (
          <p className="text-sm text-muted">You can review this book after your copy is delivered.</p>
        ) : (
          <p className="text-sm text-muted">
            Bought this book?{" "}
            <Link href={`/login?next=${encodeURIComponent(`/books/${slug}#reviews`)}`} className="font-medium text-accent-fg hover:underline">
              Log in
            </Link>{" "}
            to review it after delivery.
          </p>
        )}
      </div>
    </section>
  );
}
