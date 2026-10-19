import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders of my books" };
const PER_PAGE = 25;
const d = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

const shipped = (o: { delivered_at: string | null; shipped_at: string | null }) =>
  o.delivered_at ? `Delivered ${d(o.delivered_at)}` : o.shipped_at ? `Shipped ${d(o.shipped_at)}` : null;

export default async function AuthorOrders({ searchParams }: PageProps<"/author/orders">) {
  await requireRole(["author", "admin"]);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_book_orders", { max_rows: PER_PAGE, skip: (page - 1) * PER_PAGE });
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Orders" intro="Every paid order of your books and where it is now. Buyers' names and addresses stay private." />
      {rows.length === 0 ? (
        <div className="card text-center text-muted">No orders yet.</div>
      ) : (
        <>
          {/* Phones: one row per order */}
          <ul className="group-list md:hidden">
            {rows.map((o) => (
              <li key={o.order_item_id} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium">
                    {o.book_title} <span className="text-muted">× {o.quantity}</span>
                  </p>
                  <span className="mono shrink-0 font-semibold">{rupees(Number(o.earning), true)}</span>
                </div>
                <p className="text-sm text-muted">
                  <span className="id-mono">{o.order_number}</span> · {d(o.paid_at)} · {o.ship_city}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <OrderStatusBadge status={o.status} />
                  {shipped(o)}
                </div>
              </li>
            ))}
          </ul>

          {/* Tablets and desktops: a compact table */}
          <div className="ledger-wrap hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="p-4 font-medium">
                    Order
                  </th>
                  <th scope="col" className="p-4 font-medium">
                    Book
                  </th>
                  <th scope="col" className="p-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="p-4 text-right font-medium">
                    Your earning
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((o) => (
                  <tr key={o.order_item_id} className="align-top">
                    <td className="p-4 whitespace-nowrap">
                      <span className="id-mono block font-medium">{o.order_number}</span>
                      <span className="text-muted">Paid {d(o.paid_at)}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-medium">{o.book_title}</span>
                      <span className="text-muted">
                        {o.quantity === 1 ? "1 copy" : `${o.quantity} copies`} · {o.ship_city}, {o.ship_state}
                      </span>
                    </td>
                    <td className="p-4">
                      <OrderStatusBadge status={o.status} />
                      <span className="mt-1 block whitespace-nowrap text-muted">{shipped(o)}</span>
                    </td>
                    <td className="mono p-4 text-right font-semibold whitespace-nowrap">{rupees(Number(o.earning), true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={`/author/orders?page=${page - 1}`}>
              Newer
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={`/author/orders?page=${page + 1}`}>
              Older
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
