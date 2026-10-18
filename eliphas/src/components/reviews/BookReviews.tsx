import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import type { PublicReview } from "@/lib/reviews";
import { ReviewForm } from "./ReviewForm";
import { ReviewReport } from "./ReviewReport";
import { ReviewResponse } from "./ReviewResponse";

const Stars = ({ value, label }: { value: number; label: string }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`h-4 w-4 ${n <= Math.round(value) ? "fill-marigold text-marigold" : "text-line-strong"}`} aria-hidden />
    ))}
  </span>
);

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

/** Reader reviews. Nothing is shown when there are none: no invented ratings. */
export function BookReviews({
  bookId,
  slug,
  reviews,
  average,
  counts,
  me,
  isAuthor,
  canReview,
  mine,
}: {
  bookId: string;
  slug: string;
  reviews: PublicReview[];
  average: number | null;
  counts: number[];
  me: string | null;
  isAuthor: boolean;
  canReview: boolean;
  mine: { rating: number; body: string } | null;
}) {
  const total = reviews.length;
  return (
    <section className="card" aria-labelledby="reviews-h" id="reviews">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reviews-h" className="text-lg">
          Reader reviews
        </h2>
        {average !== null && (
          <p className="flex items-center gap-2 text-sm">
            <Stars value={average} label={`Average ${average.toFixed(1)} out of 5`} />
            <span className="mono text-muted">
              {average.toFixed(1)} · {total} {total === 1 ? "review" : "reviews"}
            </span>
          </p>
        )}
      </div>

      {total > 0 && (
        <dl className="mt-3 max-w-sm space-y-1 text-sm" aria-label="Ratings breakdown">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2">
              <dt className="text-muted">{n} star{n === 1 ? "" : "s"}</dt>
              <dd className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className="block h-full rounded-full bg-marigold" style={{ width: `${(counts[n - 1] / total) * 100}%` }} />
              </dd>
              <dd className="text-right mono text-muted">{counts[n - 1]}</dd>
            </div>
          ))}
        </dl>
      )}

      {total === 0 ? (
        <p className="mt-4 text-muted">No reviews yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {reviews.map((r) => (
            <li key={r.id} id={`review-${r.id}`} className="scroll-mt-24 py-3" data-testid="review">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Stars value={r.rating} label={`${r.rating} out of 5`} />
                <span className="font-semibold">{r.name}</span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success" data-testid="verified-purchase">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified purchase
                  </span>
                )}
                <span className="text-muted">
                  · {when(r.created_at)}
                  {r.edited_at && " · edited"}
                </span>
              </p>
              {r.body && <p className="mt-1 break-words whitespace-pre-line">{r.body}</p>}
              {r.response && (
                <div className="mt-2 rounded-[var(--radius-control)] border-l-2 border-accent bg-surface-2 px-3 py-2 text-sm" data-testid="author-response">
                  <p className="text-xs font-semibold text-muted">Response from the author · {when(r.response_at ?? r.created_at)}</p>
                  <p className="mt-1 break-words whitespace-pre-line">{r.response}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-4">
                {isAuthor && <ReviewResponse reviewId={r.id} initial={r.response} />}
                {me && me !== r.user_id && <ReviewReport reviewId={r.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {isAuthor ? (
          <p className="text-sm text-muted">You can&apos;t review your own book, but you can respond to reviews.</p>
        ) : canReview ? (
          <ReviewForm bookId={bookId} initial={mine} />
        ) : me ? (
          <p className="text-sm text-muted">
            <Link href="/onboarding" className="font-medium text-accent-fg hover:underline">
              Add your name
            </Link>{" "}
            to review books.
          </p>
        ) : (
          <p className="text-sm text-muted">
            <Link href={`/login?next=${encodeURIComponent(`/books/${slug}#reviews`)}`} className="font-medium text-accent-fg hover:underline">
              Log in
            </Link>{" "}
            to rate and review this book.
          </p>
        )}
        <details className="mt-3 text-sm text-muted" data-testid="review-policy">
          <summary className="min-h-11 cursor-pointer content-center font-medium text-fg">How reviews work</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Any logged-in reader can rate and review a book once, and edit or delete it later.</li>
            <li>&ldquo;Verified purchase&rdquo; means the reviewer&apos;s order of this book was delivered. It disappears if that order is cancelled or refunded.</li>
            <li>Authors can&apos;t review their own books or remove reviews. They may post one public response.</li>
            <li>We remove reviews only for abuse, spam, hate, private information or copied content, never for being negative. Use Report if you see a problem.</li>
            <li>The average counts every published review.</li>
          </ul>
          <Link href="/community-guidelines" className="mt-2 inline-flex min-h-11 items-center font-medium text-accent-fg hover:underline">
            Community guidelines
          </Link>
        </details>
      </div>
    </section>
  );
}
