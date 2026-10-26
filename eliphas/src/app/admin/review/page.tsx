import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { timeAgo } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { coverUrl, LANGUAGE_LABEL } from "@/lib/books";
import { isEeid } from "@/lib/eeid-format";
import { STATUS, type BookStatus } from "@/lib/publishing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review queue" };

const FILTERS: { value: BookStatus | "all"; label: string }[] = [
  { value: "in_review", label: "Waiting" },
  { value: "changes_requested", label: STATUS.changes_requested.label },
  { value: "published", label: STATUS.published.label },
  { value: "unpublished", label: STATUS.unpublished.label },
  { value: "draft", label: "Drafts" },
  { value: "all", label: "All" },
];

export default async function ReviewQueue({ searchParams }: PageProps<"/admin/review">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const status = (FILTERS.find((f) => f.value === sp.status)?.value ?? "in_review") as BookStatus | "all";
  const noSample = sp.sample === "missing";
  const q = typeof sp.q === "string" ? sp.q.replace(/[,()*%\\:."']/g, " ").trim().slice(0, 80) : "";
  const eeidQ = isEeid(q.toUpperCase()) ? q.toUpperCase() : null; // exact Edition ID search, across every status

  const supabase = await createClient();
  let query = supabase
    .from("books")
    .select("id, title, author_name, slug, status, language, cover_path, submitted_at, updated_at, page_count, mrp, eeid, age_rating")
    .limit(100);
  if (status !== "all" && !eeidQ) query = query.eq("status", status);
  if (noSample) query = query.is("sample_path", null);
  if (eeidQ) query = query.eq("eeid", eeidQ);
  else if (q) query = query.or(`title.ilike.%${q}%,author_name.ilike.%${q}%`);
  // Oldest submission first, so nobody waits too long
  query = status === "in_review" ? query.order("submitted_at", { ascending: true }) : query.order("updated_at", { ascending: false });
  const [{ data: books }, { count: waiting }] = await Promise.all([
    query,
    supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "in_review"),
  ]);
  // Content check of each book's current manuscript (file paths are private, so read with full access)
  const ids = (books ?? []).map((b) => b.id);
  const admin = createAdminClient();
  const [{ data: paths }, { data: checks }] = ids.length
    ? await Promise.all([
        admin.from("books").select("id, manuscript_path").in("id", ids),
        admin.from("manuscript_checks").select("book_id, manuscript_path, results").in("book_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const manuscriptOf = new Map((paths ?? []).map((p) => [p.id, p.manuscript_path]));
  const flagged = (bookId: string) => {
    const c = (checks ?? []).find((x) => x.book_id === bookId && x.manuscript_path === manuscriptOf.get(bookId));
    if (!c) return null;
    return (c.results as { status: string }[]).filter((r) => r.status !== "pass").length;
  };

  return (
    <>
      <PageHeader title="Review queue" intro={`${waiting ?? 0} book${waiting === 1 ? "" : "s"} waiting for review.`} />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/review?status=${f.value}`}
            aria-current={status === f.value ? "true" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${
              status === f.value ? "bg-accent text-on-accent" : "bg-surface-2 text-fg"
            }`}
          >
            {f.label}
            {f.value === "in_review" && waiting ? ` (${waiting})` : ""}
          </Link>
        ))}
      </div>
      {status === "published" && (
        <p className="mb-4 text-sm">
          {noSample ? (
            <>
              Showing live books without a free sample (readers see &ldquo;Sample coming soon&rdquo;).{" "}
              <Link href="/admin/review?status=published" className="font-semibold underline underline-offset-2">
                Show all live books
              </Link>
            </>
          ) : (
            <Link href="/admin/review?status=published&sample=missing" className="font-semibold underline underline-offset-2">
              Only books without a free sample
            </Link>
          )}
        </p>
      )}
      <form action="/admin/review" className="mb-6 flex gap-2">
        <input type="hidden" name="status" value={status} />
        <label htmlFor="q" className="sr-only">
          Search title, author or exact EEID
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search title, author or EEID" className="field" />
        <button className="btn-ghost">Search</button>
      </form>

      {!books?.length ? (
        <div className="card text-center text-muted">
          {status === "in_review" ? "Nothing waiting. All caught up!" : "No books here."}
        </div>
      ) : (
        <ul className="space-y-3">
          {books.map((b) => (
            <li key={b.id}>
              <Link href={`/admin/books/${b.id}`} className="card flex items-center gap-4 p-3 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="w-12 shrink-0">
                  <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size="xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.title}</p>
                  <p className="truncate text-sm text-muted">
                    {b.author_name} · {LANGUAGE_LABEL[b.language]}
                    {b.page_count ? ` · ${b.page_count} pages` : ""}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={b.status} />
                    {b.status === "in_review" && <span className="text-xs text-muted">submitted {timeAgo(b.submitted_at)}</span>}
                    {b.eeid && <span className="id-mono text-xs text-muted" data-testid="row-eeid">{b.eeid}</span>}
                    {b.age_rating === "mature" && <span className="badge bg-tint-danger text-danger">18+</span>}
                    {manuscriptOf.get(b.id) &&
                      (() => {
                        const n = flagged(b.id);
                        return n === null ? (
                          <span className="text-xs text-muted">not checked</span>
                        ) : n ? (
                          <span className="badge bg-tint-warn text-fg" data-testid="row-flags">
                            {n} content {n === 1 ? "flag" : "flags"}
                          </span>
                        ) : (
                          <span className="text-xs text-success">content clear</span>
                        );
                      })()}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
