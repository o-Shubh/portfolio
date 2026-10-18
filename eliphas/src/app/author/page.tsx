import { AlertCircle, BookOpen, ChevronRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ProBadge } from "@/components/ProBadge";
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
import { getCommissionTerms, proStatus } from "@/lib/plans";
import { AUTHOR_ACTION_STATUSES } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const [books, stats, pro, terms, { data: serviceActions }] = await Promise.all([
    listOwnBooks(),
    getAuthorStats(profile.id, range.months),
    proStatus(profile.id),
    getCommissionTerms(),
    createAdminClient().from("service_orders").select("id, status, order_number").eq("author_id", profile.id).in("status", AUTHOR_ACTION_STATUSES),
  ]);
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

  // Everything that needs the author, in one place, each with the action to take
  const todo: { key: string; text: React.ReactNode; href: string; action: string }[] = [
    ...needsAction.map((b) => ({ key: b.id, text: <><span className="font-semibold">{b.title}</span>: our team asked for changes.</>, href: `/author/books/${b.id}`, action: "See note" })),
    ...books
      .filter((b) => b.status === "published" && !b.sample_path)
      .map((b) => ({ key: `sample-${b.id}`, text: <><span className="font-semibold">{b.title}</span> shows &ldquo;Sample coming soon&rdquo;. Add a free sample so readers can try it.</>, href: `/author/books/${b.id}/sample`, action: "Add sample" })),
    ...(serviceActions ?? []).map((o) => ({ key: o.id, text: <>Service request <span className="font-semibold">{o.order_number}</span> is waiting for you.</>, href: `/author/services/${o.id}`, action: "Open" })),
    ...(!profile.author_terms_accepted_at ? [{ key: "terms", text: <>New author terms need your acceptance before you publish new books.</>, href: "/author/plan", action: "Review terms" }] : []),
    ...(!totals.upi && totals.balance > 0 ? [{ key: "upi", text: <>Add your UPI ID so we can pay your earnings.</>, href: "/account/profile", action: "Add UPI ID" }] : []),
  ];

  const draft = books[0];
  const startSteps = [
    { label: "Complete your profile (name, city, UPI ID for payouts)", done: Boolean(profile.full_name && profile.city && totals.upi), href: "/account/profile" },
    { label: "Upload your first book", done: Boolean(draft), href: draft ? `/author/books/${draft.id}/files` : "/author/books/new" },
    { label: "Set your price", done: Boolean(draft && draft.mrp !== null), href: draft ? `/author/books/${draft.id}/print` : "/author/books/new" },
    { label: "Prepare a free sample", done: Boolean(draft?.sample_path), href: draft ? `/author/books/${draft.id}/sample` : "/author/books/new" },
    { label: "Preview and submit for review", done: Boolean(draft && draft.status !== "draft"), href: draft ? `/author/books/${draft.id}/preview` : "/author/books/new" },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name?.split(" ")[0]}`}
        intro="Your books, sales and earnings."
        action={
          <Link href="/author/books/new" className="btn-primary">
            <Plus className="h-5 w-5" aria-hidden /> New book
          </Link>
        }
      />

      {/* New authors: the four steps to a first book, from real data */}
      {!books.some((b) => b.status === "published" || b.status === "in_review") && (
        <section aria-labelledby="start-h" className="card mb-8">
          <h2 id="start-h" className="text-lg">
            Get your first book live
          </h2>
          <ol className="mt-3 divide-y divide-line">
            {startSteps.map((st, i) => (
              <li key={st.label} className="flex items-center gap-3 py-3">
                <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${st.done ? "bg-success/15 text-success" : "bg-surface-2"}`}>
                  {st.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={st.done ? "text-muted line-through" : "font-medium"}>{st.label}</span>
                  <span className="sr-only">{st.done ? " (done)" : " (to do)"}</span>
                </span>
                {!st.done && (
                  <Link href={st.href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-fg">
                    Start <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {todo.length > 0 && (
        <section aria-labelledby="todo-h" className="mb-8 rounded-[var(--radius-card)] bg-surface ring-2 ring-accent/30">
          <h2 id="todo-h" className="flex items-center gap-2 px-5 pt-4 font-sans text-base font-semibold">
            <AlertCircle className="h-5 w-5 text-accent-fg" aria-hidden /> Needs your attention
          </h2>
          <ul className="divide-y divide-line">
            {todo.map((t) => (
              <li key={t.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
                <p className="min-w-0 flex-1">{t.text}</p>
                <Link href={t.href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-fg">
                  {t.action} <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Headline numbers (all time). Earnings are the author's share after costs, never the readers' payments. */}
      <h2 className="sr-only">Earnings</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Copies sold" value={String(totals.copies)} sub={`${totals.monthCopies} this month`} />
        <Tile label="Your earnings" value={compactRupees(totals.earned)} sub={`${rupees(totals.monthEarnings)} this month`} />
        <Tile
          label="Available for payout"
          value={compactRupees(Math.max(0, totals.balance))}
          sub={totals.upi ? `Paid to ${totals.upi}` : "Add your UPI ID"}
          subHref={totals.upi ? undefined : "/account/profile"}
          highlight
        />
        <Tile label="Paid to you" value={compactRupees(totals.paid)} sub={stats.payouts[0] ? `Last on ${fmtDate(stats.payouts[0].paid_at ?? stats.payouts[0].created_at)}` : "No payouts yet"} />
      </dl>
      <p className="mt-3 text-sm text-muted">
        {totals.inProgress > 0 && (
          <>
            <span className="font-medium text-fg">{rupees(totals.inProgress)}</span> of your earnings is on orders still being printed or delivered.{" "}
          </>
        )}
        Earnings are your share after printing, platform commission (+ GST) and payment charges; what readers pay is not shown as income. No tax is withheld at present; any TDS will be shown here separately. Shipping is paid by readers and never deducted.
      </p>
      <Link href="/author/earnings" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-fg">
        Earnings by order and payouts <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>

      {/* Book status comes before charts: it's what authors act on */}
      <section className="mt-10" aria-labelledby="books-h">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="books-h" className="text-2xl">
            Your books
          </h2>
          <Link href="/author/books" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-fg">
            Manage books
          </Link>
        </div>
        {books.length === 0 ? (
          <EmptyState icon={BookOpen} title="No books yet" text="Add your title and manuscript; you can save and come back at any step." action={<Link href="/author/books/new" className="btn-primary">Start your first book</Link>} />
        ) : (
          <>
          {/* Phones: one row per book */}
          <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line sm:hidden">
            {books.map((b) => {
              const st = stats.byBook.get(b.id);
              return (
                <li key={b.id}>
                  <Link href={`/author/books/${b.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold" lang={b.language}>{b.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <StatusBadge status={b.status} />
                        <span className="mono">{copiesText(st?.copies ?? 0)}</span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold mono">{rupees(st?.earnings ?? 0)}</span>
                      <span className="text-xs text-muted">your earnings</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto rounded-[var(--radius-card)] bg-surface ring-1 ring-line sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Status, copies sold and your earnings per book, all time</caption>
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="p-4 font-medium">Book</th>
                  <th scope="col" className="p-4 font-medium">Status</th>
                  <th scope="col" className="p-4 text-right font-medium">Copies</th>
                  <th scope="col" className="p-4 text-right font-medium">Your earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {books.map((b) => {
                  const st = stats.byBook.get(b.id);
                  return (
                    <tr key={b.id}>
                      <th scope="row" className="p-4 font-semibold" lang={b.language}>
                        <Link href={`/author/books/${b.id}`} className="hover:underline">
                          {b.title}
                        </Link>
                      </th>
                      <td className="p-4">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="p-4 text-right mono">{st?.copies ?? 0}</td>
                      <td className="p-4 text-right mono">{rupees(st?.earnings ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

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
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold md:min-h-9 ${
                r.key === range.key ? "bg-surface text-fg" : "text-muted hover:text-fg"
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

      {/* Order tracking */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl">Latest orders</h2>
            <Link href="/author/orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-fg">
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
                  <span className="font-semibold mono">{rupees(Number(p.amount))}</span>
                </li>
              ))}
            </ul>
          )}
          {!totals.upi && (
            <Link href="/account/profile" className="mt-4 flex items-center justify-between rounded-[var(--radius-card)] bg-accent/10 p-3 text-sm font-semibold ring-1 ring-accent/30">
              Add your UPI ID to get paid <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      <section className="card mt-10 flex flex-wrap items-center justify-between gap-4" aria-label="Plan">
        <div>
          <p className="text-sm text-muted">Your plan</p>
          <p className="flex items-center gap-2 text-lg font-semibold">{pro.active ? <>Author Pro <ProBadge /></> : profile.author_terms_accepted_at ? "Free" : "Original terms"}</p>
          <p className="text-sm text-muted">
            {pro.active
              ? `Paid until ${new Date(pro.accessUntil!).toLocaleDateString("en-IN", { dateStyle: "medium" })} · ${pro.credits} creative credit${pro.credits === 1 ? "" : "s"} left · renews only if you pay again`
              : profile.author_terms_accepted_at
                ? "Upgrade any time for a lower commission, analytics and promotional creatives."
                : `New author terms (version ${terms.version}) need your acceptance before you publish new books.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pro.active && (
            <Link href="/author/analytics" className="btn-ghost">
              Analytics
            </Link>
          )}
          <Link href="/author/plan" className="btn-ghost">
            {pro.active ? "Manage plan" : profile.author_terms_accepted_at ? "See Author Pro" : "Review terms"}
          </Link>
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
    <div className={`card p-4 md:p-5 ${highlight ? "bg-tint-info ring-accent-fg/20" : ""}`}>
      <dt className="text-[0.72rem] font-semibold tracking-[0.04em] text-muted uppercase">{label}</dt>
      <dd className="mono mt-1.5 text-[1.75rem] leading-tight font-medium md:text-[2rem]">{value}</dd>
      <dd className="mt-1 truncate text-sm text-muted">
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
  return <p className="grid min-h-40 place-items-center rounded-[var(--radius-card)] bg-surface-2 p-6 text-center text-sm text-muted">{text}</p>;
}
