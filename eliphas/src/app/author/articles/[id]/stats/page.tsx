import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColumnChart, type Column } from "@/components/charts/ColumnChart";
import { requireRole } from "@/lib/auth";
import { VIEWS_NOTE } from "@/lib/article-format";
import { articleCounts } from "@/lib/articles";
import { proStatus } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Article readership", robots: { index: false } };

const DAYS = 30;

export default async function ArticleStatsPage({ params }: PageProps<"/author/articles/[id]/stats">) {
  const profile = await requireRole(["author", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: a } = await admin.from("articles").select("id, title, author_id, related_book_id").eq("id", id).maybeSingle();
  if (!a || a.author_id !== profile.id) notFound();
  const [counts, pro] = await Promise.all([articleCounts(a.id), proStatus(profile.id)]);

  let series: Column[] = [];
  let bookClicks = 0;
  if (pro.active) {
    const since = new Date(new Date().getTime() - (DAYS - 1) * 86400000);
    const sinceDay = since.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const [{ data: views }, { data: clicks }] = await Promise.all([
      admin.from("article_views").select("day").eq("article_id", a.id).gte("day", sinceDay),
      admin.from("article_book_clicks").select("day").eq("article_id", a.id),
    ]);
    bookClicks = clicks?.length ?? 0;
    series = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(since.getTime() + i * 86400000);
      const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const value = (views ?? []).filter((v) => v.day === key).length;
      const label = d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" });
      const longLabel = d.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
      return { key, label, longLabel, value, valueText: `${value} view${value === 1 ? "" : "s"}` };
    });
  }

  return (
    <>
      <Link href={`/author/articles/${a.id}`} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the article
      </Link>
      <h1 className="mt-1 text-2xl md:text-3xl">Readership</h1>
      <p className="mt-1 text-muted">{a.title}</p>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["Views", counts.views],
          ["Likes", counts.likes],
          ["Comments", counts.comments],
        ].map(([k, v]) => (
          <div key={k} className="card">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="mt-1 text-2xl font-semibold mono">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">{VIEWS_NOTE} Your own visits aren&apos;t counted.</p>

      {pro.active ? (
        <>
          <section className="card mt-6">
            <h2 className="text-lg">Views by day (last {DAYS} days)</h2>
            <div className="mt-4">
              <ColumnChart data={series} caption={`Views per day for the last ${DAYS} days`} />
            </div>
          </section>
          <section className="card mt-6">
            <h2 className="text-lg">Related-book clicks</h2>
            {a.related_book_id ? (
              <>
                <p className="mt-2 text-3xl font-semibold mono">{bookClicks}</p>
                <p className="mt-1 text-sm text-muted">
                  Times readers opened your book from this article (once per reader or browser per day). This shows interest, not sales: we don&apos;t link these clicks
                  to orders.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Add a related book to the article to see how many readers open it.</p>
            )}
          </section>
        </>
      ) : (
        <section className="card mt-6">
          <h2 className="text-lg">Readership by date and book clicks</h2>
          <p className="mt-1 text-sm text-muted">Daily views and clicks on your related book are part of Author Pro.</p>
          <Link href="/author/plan" className="btn-ghost mt-3">
            See Author Pro
          </Link>
        </section>
      )}
    </>
  );
}
