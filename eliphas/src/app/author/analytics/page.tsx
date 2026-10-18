import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { proStatus } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ArchiveLink, CopyLink, NewCampaignLink } from "./CampaignForms";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [
  { key: "30", label: "30 days", days: 30, grain: "day" },
  { key: "90", label: "90 days", days: 90, grain: "week" },
  { key: "365", label: "12 months", days: 365, grain: "month" },
] as const;

export default async function AnalyticsPage({ searchParams }: PageProps<"/author/analytics">) {
  const profile = await requireRole(["author", "admin"]);
  const status = await proStatus(profile.id);
  if (!status.active) {
    return (
      <>
        <PageHeader title="Analytics" />
        <div className="card max-w-xl space-y-3">
          <p>Detailed analytics and campaign-link tracking are part of Pro. Your sales, earnings and payouts are always on your dashboard for free.</p>
          <Link href="/author/plan" className="btn-primary">
            See plans
          </Link>
        </div>
      </>
    );
  }

  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[0];
  const to = new Date();
  const from = new Date(to.getTime() - (range.days - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const supabase = await createClient();
  const [{ data: series, error }, { data: campaigns }, { data: books }] = await Promise.all([
    supabase.rpc("my_sales_series", { p_from: iso(from), p_to: iso(to), p_grain: range.grain }),
    supabase.rpc("my_campaign_stats"),
    createAdminClient().from("books").select("id, title, status").eq("author_id", profile.id),
  ]);
  const titles = new Map((books ?? []).map((b) => [b.id, b.title]));
  const byPeriod = new Map<string, { copies: number; earnings: number }>();
  const byBook = new Map<string, { copies: number; earnings: number }>();
  for (const r of series ?? []) {
    const p = byPeriod.get(r.period) ?? { copies: 0, earnings: 0 };
    p.copies += Number(r.copies);
    p.earnings += Number(r.earnings);
    byPeriod.set(r.period, p);
    const b = byBook.get(r.book_id) ?? { copies: 0, earnings: 0 };
    b.copies += Number(r.copies);
    b.earnings += Number(r.earnings);
    byBook.set(r.book_id, b);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <PageHeader title="Analytics" intro="Actual paid sales only. Nothing here is estimated or projected." />
      <nav aria-label="Time range" className="mb-6 flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/author/analytics?range=${r.key}`}
            aria-current={r.key === range.key ? "true" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm ${r.key === range.key ? "bg-primary text-on-primary" : "bg-surface ring-1 ring-line"}`}
          >
            {r.label}
          </Link>
        ))}
      </nav>
      {error && <p className="card mb-6 text-danger">Couldn&apos;t load analytics.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-x-auto">
          <h2 className="text-lg">Sales by {range.grain}</h2>
          {byPeriod.size === 0 ? (
            <p className="mt-3 text-sm text-muted">No sales in this period.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 text-left font-medium">{range.grain === "day" ? "Date" : range.grain === "week" ? "Week of" : "Month"}</th>
                  <th className="py-1 text-right font-medium">Copies</th>
                  <th className="py-1 text-right font-medium">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...byPeriod.entries()].map(([period, v]) => (
                  <tr key={period}>
                    <td className="py-1.5">{new Date(period).toLocaleDateString("en-IN", range.grain === "month" ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" })}</td>
                    <td className="py-1.5 text-right mono">{v.copies}</td>
                    <td className="py-1.5 text-right mono">{rupees(Math.round(v.earnings * 100) / 100, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card overflow-x-auto">
          <h2 className="text-lg">Sales by book</h2>
          {byBook.size === 0 ? (
            <p className="mt-3 text-sm text-muted">No sales in this period.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 text-left font-medium">Book</th>
                  <th className="py-1 text-right font-medium">Copies</th>
                  <th className="py-1 text-right font-medium">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...byBook.entries()].sort((a, b) => b[1].copies - a[1].copies).map(([id, v]) => (
                  <tr key={id}>
                    <td className="py-1.5">{titles.get(id) ?? "—"}</td>
                    <td className="py-1.5 text-right mono">{v.copies}</td>
                    <td className="py-1.5 text-right mono">{rupees(Math.round(v.earnings * 100) / 100, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card mt-6 space-y-4" aria-labelledby="campaign-heading">
        <div>
          <h2 id="campaign-heading" className="text-lg">
            Campaign links
          </h2>
          <p className="mt-1 text-sm text-muted">
            Share a different link in each place to see what works. <strong className="text-fg">Clicks</strong> count visits to the link.{" "}
            <strong className="text-fg">Purchases</strong> count paid orders of that book made within 30 days of a click on the same device. A click is not a
            sale, and some buyers won&apos;t be counted (other devices, cleared cookies). No reader details are collected.
          </p>
        </div>
        <NewCampaignLink books={(books ?? []).filter((b) => b.status === "published")} />
        {campaigns && campaigns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 text-left font-medium">Link</th>
                  <th className="py-1 text-left font-medium">Book</th>
                  <th className="py-1 text-right font-medium">Clicks</th>
                  <th className="py-1 text-right font-medium">Purchases</th>
                  <th className="py-1 text-right font-medium">Copies</th>
                  <th className="py-1">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((c) => (
                  <tr key={c.link_id} className={c.archived ? "text-muted" : ""}>
                    <td className="py-2">
                      <span className="block font-medium">{c.label}</span>
                      <span className="block text-xs text-muted select-all">
                        {site}/c/{c.code}
                      </span>
                    </td>
                    <td className="py-2">{titles.get(c.book_id) ?? "—"}</td>
                    <td className="py-2 text-right mono">{Number(c.clicks)}</td>
                    <td className="py-2 text-right mono">{Number(c.orders)}</td>
                    <td className="py-2 text-right mono">{Number(c.copies)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {!c.archived && (
                        <span className="flex justify-end gap-3">
                          <CopyLink url={`${site}/c/${c.code}`} />
                          <ArchiveLink id={c.link_id} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
