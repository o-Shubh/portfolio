import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Earnings & payouts" };

const EARNING_STATUSES = ["paid", "accepted", "printing", "printed", "packed", "shipped", "delivered", "cancelled"] as const;
const PAGE = 50;
const n = (v: unknown) => Number(v ?? 0);
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");

type Line = {
  id: string;
  quantity: number;
  unit_price: number;
  print_cost_total: number | null;
  print_cost: number | null;
  commission: number | null;
  commission_gst: number | null;
  gateway_allocated: number | null;
  author_earning_total: number | null;
  author_earning: number | null;
  author_plan: string | null;
  sale_channel: string;
  author_discount: number;
  reversed_at: string | null;
  books: { title: string; language: string } | null;
  orders: { order_number: string; status: Parameters<typeof OrderStatusBadge>[0]["status"]; paid_at: string | null; delivered_at: string | null; gateway_fee_source: string | null };
};

/**
 * The author's own money, line by line, from the figures stored when each order was confirmed.
 * Nothing here is recalculated with today's rates. Buyers' names and addresses are never shown.
 */
export default async function EarningsPage({ searchParams }: PageProps<"/author/earnings">) {
  const me = await requireRole(["author", "admin"]);
  const page = Math.max(1, Math.min(200, Number((await searchParams).page) || 1));
  const admin = createAdminClient();
  const [{ data: all }, { data: rows, count }, { data: payouts }] = await Promise.all([
    admin
      .from("order_items")
      .select("quantity, author_earning_total, author_earning, reversed_at, orders!inner(status)")
      .eq("author_id", me.id)
      .in("orders.status", ["paid", "accepted", "printing", "printed", "packed", "shipped", "delivered"]),
    admin
      .from("order_items")
      .select(
        "id, quantity, unit_price, print_cost_total, print_cost, commission, commission_gst, gateway_allocated, author_earning_total, author_earning, author_plan, sale_channel, author_discount, reversed_at, books(title, language), orders!inner(order_number, status, paid_at, delivered_at, gateway_fee_source)",
        { count: "exact" },
      )
      .eq("author_id", me.id)
      .in("orders.status", [...EARNING_STATUSES])
      .not("orders.paid_at", "is", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1),
    admin.from("payouts").select("id, amount, reference, status, paid_at, created_at, note").eq("author_id", me.id).order("created_at", { ascending: false }),
  ]);

  const earning = (l: { author_earning_total: number | null; author_earning: number | null; quantity: number; reversed_at: string | null }) =>
    l.reversed_at ? 0 : l.author_earning_total !== null ? n(l.author_earning_total) : n(l.author_earning) * l.quantity;
  const lines = (all ?? []) as unknown as { quantity: number; author_earning_total: number | null; author_earning: number | null; reversed_at: string | null; orders: { status: string } }[];
  const total = lines.reduce((s, l) => s + earning(l), 0);
  const pending = lines.filter((l) => l.orders.status !== "delivered").reduce((s, l) => s + earning(l), 0);
  const paid = (payouts ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + n(p.amount), 0);
  const balance = total - paid;
  const ready = Math.max(0, balance - pending);
  const list = (rows ?? []) as unknown as Line[];
  const reversed = list.filter((l) => l.reversed_at || l.orders.status === "cancelled");
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  const tiles = [
    { label: "Your earnings, all time", value: total, sub: "Your share after costs. Not what readers paid." },
    { label: "Paid to you", value: paid, sub: `${(payouts ?? []).filter((p) => p.status === "paid").length} payouts` },
    { label: "On delivered orders, not yet paid", value: ready, sub: "Included in the next payout" },
    { label: "Pending", value: Math.min(pending, Math.max(0, balance)), sub: "Orders still being printed or delivered" },
  ];

  return (
    <>
      <PageHeader title="Earnings & payouts" intro="Every figure comes from what was recorded when each order was paid. Changes to plans or rates never change past orders." />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4 md:p-5">
            <dt className="text-sm text-muted">{t.label}</dt>
            <dd className="mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-tight tabular-nums">{rupees(Math.round(t.value * 100) / 100)}</dd>
            <dd className="mt-1 text-sm text-muted">{t.sub}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        Earnings per copy = selling price − printing − platform commission − GST on commission − the payment charge allocated to the book. Shipping is paid by readers and never deducted. No tax (TDS/TCS) is withheld at present; if that changes it will appear here as its own line. Payouts go to the UPI ID in{" "}
        <Link href="/account/profile" className="font-medium text-accent-fg underline-offset-2 hover:underline">
          Settings
        </Link>
        .
      </p>

      <section className="mt-10" aria-labelledby="lines-h">
        <h2 id="lines-h" className="text-xl">
          Earnings by order
        </h2>
        {list.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-card)] border border-dashed border-line-strong p-8 text-center text-muted">No paid orders yet. Your earnings appear here as soon as a reader pays.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
            <table className="w-full min-w-[860px] text-left text-sm tabular-nums">
              <caption className="sr-only">Your earnings for each paid order line, with the costs taken from the selling price</caption>
              <thead className="border-b border-line bg-surface-2 text-muted">
                <tr>
                  <th scope="col" className="p-3 font-medium">Paid</th>
                  <th scope="col" className="p-3 font-medium">Book</th>
                  <th scope="col" className="p-3 font-medium">Status</th>
                  <th scope="col" className="p-3 text-right font-medium">Selling price</th>
                  <th scope="col" className="p-3 text-right font-medium">Printing</th>
                  <th scope="col" className="p-3 text-right font-medium">Commission</th>
                  <th scope="col" className="p-3 text-right font-medium">GST on commission</th>
                  <th scope="col" className="p-3 text-right font-medium">Payment charge</th>
                  <th scope="col" className="p-3 text-right font-medium">Your earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((l) => {
                  const sale = n(l.unit_price) * l.quantity - n(l.author_discount);
                  const legacy = l.commission === null;
                  const void_ = Boolean(l.reversed_at) || l.orders.status === "cancelled";
                  return (
                    <tr key={l.id} className={void_ ? "text-muted" : ""}>
                      <td className="p-3 whitespace-nowrap">{date(l.orders.paid_at)}</td>
                      <td className="p-3">
                        <span className="font-medium" lang={l.books?.language}>{l.books?.title}</span>
                        <span className="block text-xs text-muted">
                          {l.orders.order_number} · {l.quantity} {l.quantity === 1 ? "copy" : "copies"}
                          {l.author_plan ? ` · ${l.author_plan === "pro" ? "Pro" : l.author_plan === "free" ? "Free" : "original"} terms` : ""}
                        </span>
                      </td>
                      <td className="p-3">
                        {void_ ? <span className="badge bg-surface-2">Refunded or cancelled</span> : <OrderStatusBadge status={l.orders.status} />}
                      </td>
                      <td className="p-3 text-right">{rupees(sale)}</td>
                      <td className="p-3 text-right">{legacy ? "—" : `− ${rupees(n(l.print_cost_total))}`}</td>
                      <td className="p-3 text-right">{legacy ? "—" : `− ${rupees(n(l.commission))}`}</td>
                      <td className="p-3 text-right">{legacy ? "—" : `− ${rupees(n(l.commission_gst))}`}</td>
                      <td className="p-3 text-right">
                        {legacy || l.gateway_allocated === null ? "—" : `− ${rupees(n(l.gateway_allocated))}`}
                        {!legacy && l.orders.gateway_fee_source === "estimated" && <span className="block text-xs text-muted">estimated</span>}
                      </td>
                      <td className="p-3 text-right font-semibold">{void_ ? <s>{rupees(earning({ ...l, reversed_at: null }))}</s> : rupees(earning(l))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.some((l) => l.commission === null) && <p className="mt-2 text-xs text-muted">“—” marks orders from before itemised records; their earnings are as recorded at the time.</p>}
        {reversed.length > 0 && <p className="mt-2 text-xs text-muted">Refunded lines are struck through and count as ₹0. They stay listed so every adjustment is visible.</p>}
        {pages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link className="btn-ghost" href={`/author/earnings?page=${page - 1}`}>
                Previous
              </Link>
            )}
            <span className="text-sm text-muted">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link className="btn-ghost" href={`/author/earnings?page=${page + 1}`}>
                Next
              </Link>
            )}
          </nav>
        )}
      </section>

      <section className="mt-10" aria-labelledby="payouts-h">
        <h2 id="payouts-h" className="text-xl">
          Payouts
        </h2>
        {!(payouts ?? []).length ? (
          <p className="mt-3 text-muted">No payouts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
            {(payouts ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="block font-medium">{date(p.paid_at ?? p.created_at)}</span>
                  <span className="text-muted">
                    {p.reference ? `Ref ${p.reference}` : "No reference"}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{rupees(n(p.amount))}</span>
                  <span className="text-xs text-muted">{p.status === "paid" ? "Paid" : p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
