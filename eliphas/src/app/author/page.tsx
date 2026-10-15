import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarList } from "@/components/charts/BarList";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";
import { getAuthorStats, monthLong, monthShort } from "@/lib/author-stats";
import { listOwnBooks } from "@/lib/author-books";
import { rupees } from "@/lib/pricing";

export const metadata: Metadata = { title: "Author dashboard" };

const RANGES = [
  { key: "6", label: "6 months", months: 6 },
  { key: "12", label: "12 months", months: 12 },
];
const copiesText = (n: number) => `${n} ${n === 1 ? "copy" : "copies"}`;
const compactRupees = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)}L` : rupees(Math.round(n)));

export default async function AuthorHome({ searchParams }: PageProps<"/author">) {
  const profile = await requireRole(["author", "admin"]);
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[1];
  const [books, stats] = await Promise.all([listOwnBooks(), getAuthorStats(profile.id, range.months)]);
  const { totals } = stats;
  const needsAction = books.filter((b) => b.status === "changes_requested");

  // Top cities, the rest folded into "Other cities"
  const TOP = 7;
  const cityRows = stats.byCity.slice(0, TOP).map((c) => ({
    key: `${c.city}-${c.state}`,
    label: c.city,
    sub: c.state,
    value: c.copies,
    detail: rupees(c.earnings),
  }));
  const rest = stats.byCity.slice(TOP);
  if (rest.length) {
    cityRows.push({
      key: "other",
      label: "Other cities",
      sub: `${rest.length}`,
      value: rest.reduce((s, c) => s + c.copies, 0),
      detail: rupees(rest.reduce((s, c) => s + c.earnings, 0)),
    });
  }
  const rangeCopies = stats.byMonth.reduce((s, m) => s + m.copies, 0);

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name?.split(" ")[0]}`}
        intro="Your sales, earnings and books."
        action={
          <Link href="/author/books/new" className="btn-primary">
            <Plus className="h-5 w-5" aria-hidden /> New book
          </Link>
        }
      />

      {needsAction.length > 0 && (
        <div className="card mb-6 ring-2 ring-danger/40">
          <h2 className="text-lg">Needs your attention</h2>
          <ul className="mt-2 space-y-1">
            {needsAction.map((b) => (
              <li key={b.id}>
                <Link href={`/author/books/${b.id}`} className="font-medium underline">
                  {b.title}
                </Link>{" "}
                — our team asked for changes.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Headline numbers (all time) */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Copies sold" value={String(totals.copies)} sub={`${totals.monthCopies} this month`} />
        <Tile label="Total earned" value={compactRupees(totals.earned)} sub={`${rupees(totals.monthEarnings)} this month`} />
        <Tile label="Paid to you" value={compactRupees(totals.paid)} sub={stats.payouts[0] ? `last on ${fmtDate(stats.payouts[0].paid_at ?? stats.payouts[0].created_at)}` : "No payouts yet"} />
        <Tile
          label="Due to you"
          value={compactRupees(Math.max(0, totals.balance))}
          sub={totals.upi ? `to ${totals.upi}` : "Add your UPI ID"}
          subHref={totals.upi ? undefined : "/account/profile"}
          highlight
        />
      </dl>

      {/* Range filter for the two charts */}
      <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Sales</h2>
        <nav aria-label="Time range" className="flex gap-1 rounded-full bg-surface-2 p-1">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/author?range=${r.key}`}
              scroll={false}
              aria-current={r.key === range.key ? "true" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold ${
                r.key === range.key ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card min-w-0">
          <h3 className="font-sans text-base">Copies sold by month</h3>
          <p className="mb-4 text-sm text-muted">
            {copiesText(rangeCopies)} in the last {range.months} months. Tap a bar for earnings.
          </p>
          {rangeCopies === 0 ? (
            <EmptyChart text="No sales in this period yet. Share your book's link to get your first readers." />
          ) : (
            <ColumnChart
              caption={`Copies sold per month, last ${range.months} months`}
              data={stats.byMonth.map((m) => ({
                key: m.month,
                label: monthShort(m.month),
                longLabel: monthLong(m.month),
                value: m.copies,
                valueText: copiesText(m.copies),
                detail: `${rupees(m.earnings)} earned`,
              }))}
            />
          )}
        </section>

        <section className="card min-w-0">
          <h3 className="font-sans text-base">Where your readers are</h3>
          <p className="mb-4 text-sm text-muted">Copies by delivery city, last {range.months} months.</p>
          {cityRows.length === 0 ? (
            <EmptyChart text="Cities appear here after your first sale." />
          ) : (
            <BarList rows={cityRows} caption={`Copies by city, last ${range.months} months`} />
          )}
        </section>
      </div>

      {/* Per-book */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl">Your books</h2>
          <Link href="/author/books" className="text-sm font-semibold underline">
            Manage books
          </Link>
        </div>
        {books.length === 0 ? (
          <div className="card text-center">
            <p className="font-semibold">No books yet.</p>
            <Link href="/author/books/new" className="btn-primary mt-4">
              Start your first book
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-surface shadow-soft ring-1 ring-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Copies sold and earnings per book, all time</caption>
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="p-4 font-medium">
                    Book
                  </th>
                  <th scope="col" className="hidden p-4 font-medium sm:table-cell">
                    Status
                  </th>
                  <th scope="col" className="p-4 text-right font-medium">
                    Copies
                  </th>
                  <th scope="col" className="p-4 text-right font-medium">
                    Earned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {books.map((b) => {
                  const s = stats.byBook.get(b.id);
                  return (
                    <tr key={b.id}>
                      <th scope="row" className="p-4 font-semibold">
                        <Link href={`/author/books/${b.id}`} className="hover:underline">
                          {b.title}
                        </Link>
                      </th>
                      <td className="hidden p-4 sm:table-cell">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="p-4 text-right tabular-nums">{s?.copies ?? 0}</td>
                      <td className="p-4 text-right tabular-nums">{rupees(s?.earnings ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Order tracking */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl">Latest orders</h2>
            <Link href="/author/orders" className="text-sm font-semibold underline">
              All orders
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <p className="text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recent.map((o) => (
                <li key={o.order_item_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {o.book_title} <span className="font-normal text-muted">× {o.quantity}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {o.ship_city} · {fmtDate(o.paid_at)} · {rupees(Number(o.earning))} to you
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card min-w-0">
          <h2 className="mb-3 text-xl">Payouts</h2>
          {stats.payouts.length === 0 ? (
            <p className="text-muted">No payouts yet. Earnings are paid to your UPI ID.</p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">{fmtDate(p.paid_at ?? p.created_at)}</span>
                    <span className="text-muted">Ref {p.reference}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{rupees(Number(p.amount))}</span>
                </li>
              ))}
            </ul>
          )}
          {!totals.upi && (
            <Link href="/account/profile" className="mt-4 flex items-center justify-between rounded-xl bg-accent/10 p-3 text-sm font-semibold ring-1 ring-accent/30">
              Add your UPI ID to get paid <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";
}

function Tile({
  label,
  value,
  sub,
  subHref,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  subHref?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "bg-accent text-on-accent ring-0" : ""}`}>
      <dt className={`text-sm ${highlight ? "opacity-75" : "text-muted"}`}>{label}</dt>
      <dd className="mt-2 font-heading text-4xl tracking-tight tabular-nums md:text-[2.75rem]">{value}</dd>
      <dd className={`mt-1 truncate text-sm ${highlight ? "opacity-80" : "text-muted"}`}>
        {subHref ? (
          <Link href={subHref} className="font-medium underline underline-offset-2">
            {sub}
          </Link>
        ) : (
          sub
        )}
      </dd>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <p className="grid min-h-40 place-items-center rounded-xl bg-surface-2 p-6 text-center text-sm text-muted">{text}</p>;
}
