import type { Metadata } from "next";
import Link from "next/link";
import { DistributionCalculator, DistributionReviewForm } from "@/components/DistributionForms";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { channelLabel, statusOf } from "@/lib/distribution";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Distribution requests" };

const OPEN = ["requested", "reviewing", "needs_information"];
const FILTERS = [
  { value: "open", label: "Open" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
] as const;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

export default async function DistributionAdminPage({ searchParams }: PageProps<"/admin/distribution">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.value === sp.status) ? (sp.status as (typeof FILTERS)[number]["value"]) : "open";

  const db = await createClient();
  let query = db.from("distribution_requests").select("*").order("created_at", { ascending: false }).limit(100);
  if (filter === "open") query = query.in("status", OPEN);
  if (filter === "declined") query = query.eq("status", "declined");
  const { data, error } = await query;

  const ids = [...new Set((data ?? []).map((r) => r.book_id))];
  const books = new Map<string, { title: string; author_name: string | null; slug: string }>();
  if (ids.length) {
    const { data: rows } = await db.from("books").select("id, title, author_name, slug").in("id", ids);
    for (const b of rows ?? []) books.set(b.id, b);
  }

  return (
    <>
      <PageHeader
        title="Distribution requests"
        intro="Review author requests for Amazon India, Flipkart and international distribution. No retailer, payment or overseas payout is connected; your note is shown to the author."
      />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="min-w-0" aria-labelledby="queue-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="queue-heading" className="text-xl">
              Requests
            </h2>
            <nav className="segmented" aria-label="Filter requests">
              {FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={f.value === "open" ? "/admin/distribution" : `/admin/distribution?status=${f.value}`}
                  aria-current={filter === f.value ? "page" : undefined}
                  className="segment px-4"
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>

          {error ? (
            <p role="alert" className="notice-danger mt-4">
              Couldn’t load requests. Check that migration 000019 has been applied.
            </p>
          ) : !data?.length ? (
            <div className="card mt-4 text-center text-muted">{filter === "open" ? "No open requests." : "Nothing here."}</div>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.map((r) => {
                const book = books.get(r.book_id);
                const s = statusOf(r.status);
                return (
                  <li key={r.id} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold">
                          {book ? (
                            <Link href={`/books/${book.slug}`} className="hover:underline">
                              {book.title}
                            </Link>
                          ) : (
                            "Unknown book"
                          )}
                        </h3>
                        <p className="text-sm text-muted">
                          {book?.author_name ?? "Unknown author"} · {channelLabel(r.channel)}
                        </p>
                      </div>
                      <span className={`badge whitespace-nowrap ${s.tone}`}>{s.label}</span>
                    </div>
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                      <dt className="text-muted">Lives in</dt>
                      <dd>{r.residence_country}</dd>
                      <dt className="text-muted">Countries</dt>
                      <dd>{r.markets}</dd>
                      <dt className="text-muted">Requested</dt>
                      <dd>{day(r.created_at)}</dd>
                      {r.reviewed_at && (
                        <>
                          <dt className="text-muted">Last review</dt>
                          <dd>{day(r.reviewed_at)}</dd>
                        </>
                      )}
                    </dl>
                    {r.author_reply && (
                      <div className="mt-3 rounded-[var(--radius-control)] bg-tint-info px-3.5 py-3">
                        <p className="text-xs font-medium text-accent-fg">Author replied{r.author_replied_at ? ` · ${day(r.author_replied_at)}` : ""}</p>
                        <p className="mt-1 text-[0.9375rem] whitespace-pre-wrap">{r.author_reply}</p>
                      </div>
                    )}
                    <DistributionReviewForm id={r.id} updatedAt={r.updated_at} status={r.status} note={r.review_note} />
                  </li>
                );
              })}
            </ul>
          )}
          {data?.length === 100 && <p className="mt-4 text-sm text-muted">Showing the latest 100.</p>}
        </section>

        <div className="xl:sticky xl:top-24">
          <DistributionCalculator />
        </div>
      </div>
    </>
  );
}
