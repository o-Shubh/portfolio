import type { Metadata } from "next";
import Link from "next/link";
import { DistributionReplyForm, DistributionRequestForm } from "@/components/DistributionForms";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { channelLabel, statusOf } from "@/lib/distribution";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Distribution" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

export default async function DistributionPage() {
  const me = await requireRole(["author", "admin"]);
  const db = await createClient();
  const [books, requests] = await Promise.all([
    db.from("books").select("id, title").eq("author_id", me.id).eq("status", "published").order("title"),
    db.from("distribution_requests").select("*").eq("author_id", me.id).order("created_at", { ascending: false }).limit(100),
  ]);
  // Titles for every requested book, including one that has since been unpublished
  const ids = [...new Set((requests.data ?? []).map((r) => r.book_id))];
  const titles = new Map<string, string>();
  if (ids.length) {
    const { data } = await db.from("books").select("id, title").in("id", ids);
    for (const b of data ?? []) titles.set(b.id, b.title);
  }
  const failed = books.error || requests.error;

  return (
    <>
      <PageHeader
        title="Reach more readers"
        intro="Ask us to review a published book for Amazon India, Flipkart or international distribution. A request doesn’t list your book anywhere and costs nothing."
      />

      {failed ? (
        <p className="notice-danger" role="alert">
          Distribution requests aren’t available right now. Please try again later.
        </p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-8">
            {books.data?.length ? (
              <DistributionRequestForm books={books.data} taken={(requests.data ?? []).map((r) => `${r.book_id}:${r.channel}`)} />
            ) : (
              <div className="card text-center">
                <h2 className="text-xl">Publish a book first</h2>
                <p className="mx-auto mt-1 max-w-md text-muted">Once a book is live in the Eliphas store, you can ask us to review it for other channels.</p>
                <Link href="/author/books" className="btn-primary mt-5">
                  Go to my books
                </Link>
              </div>
            )}

            <section aria-labelledby="mine-heading">
              <h2 id="mine-heading" className="text-xl">
                Your requests
              </h2>
              {!requests.data?.length ? (
                <p className="mt-2 text-muted">No requests yet.</p>
              ) : (
                <ul className="group-list mt-3">
                  {requests.data.map((r) => {
                    const s = statusOf(r.status);
                    return (
                      <li key={r.id} className="space-y-2 px-4 py-4 md:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                          <div className="min-w-0">
                            <h3 className="font-semibold">{titles.get(r.book_id) ?? "Book no longer available"}</h3>
                            <p className="text-sm text-muted">
                              {channelLabel(r.channel)} · Requested {day(r.created_at)}
                            </p>
                          </div>
                          <span className={`badge whitespace-nowrap ${s.tone}`}>{s.label}</span>
                        </div>
                        <p className="text-sm">
                          <span className="text-muted">Countries:</span> {r.markets}
                        </p>
                        {r.review_note ? (
                          <div className="rounded-[var(--radius-control)] bg-surface-2 px-3.5 py-3">
                            <p className="text-xs font-medium text-muted">
                              From the Eliphas team
                              {r.reviewed_at ? ` · ${day(r.reviewed_at)}` : ""}
                            </p>
                            <p className="mt-1 text-[0.9375rem] whitespace-pre-wrap">{r.review_note}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted">Waiting for review. Nothing has been charged.</p>
                        )}
                        {r.author_reply && (
                          <div className="rounded-[var(--radius-control)] px-3.5 py-3 ring-1 ring-line">
                            <p className="text-xs font-medium text-muted">Your reply{r.author_replied_at ? ` · ${day(r.author_replied_at)}` : ""}</p>
                            <p className="mt-1 text-[0.9375rem] whitespace-pre-wrap">{r.author_reply}</p>
                          </div>
                        )}
                        {r.status === "needs_information" && (
                          <DistributionReplyForm id={r.id} updatedAt={r.updated_at} markets={r.markets} residence={r.residence_country} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24" aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-lg">
              How it works
            </h2>
            <ol className="space-y-3 text-[0.9375rem]">
              {[
                ["Send a request", "One per book and channel."],
                ["We review eligibility", "Rights, ISBN, retailer approval, printing coverage and payouts."],
                ["We reply here", "If we can offer distribution, we’ll share terms for you to accept first."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-medium" aria-hidden>
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted">Your Eliphas store listing, prices and royalties stay exactly as they are.</p>
          </aside>
        </div>
      )}
    </>
  );
}
