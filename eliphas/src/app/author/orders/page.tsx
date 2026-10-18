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
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                {["Order", "Book", "Copies", "City", "Paid", "Status", "Shipped / delivered", "Your earning"].map((h, i) => (
                  <th key={h} scope="col" className={`p-4 font-medium ${i === 2 || i === 7 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.order_item_id}>
                  <td className="p-4 font-medium whitespace-nowrap id-mono">{o.order_number}</td>
                  <td className="p-4 font-semibold">{o.book_title}</td>
                  <td className="p-4 text-right mono">{o.quantity}</td>
                  <td className="p-4">
                    {o.ship_city}, <span className="text-muted">{o.ship_state}</span>
                  </td>
                  <td className="p-4 whitespace-nowrap">{d(o.paid_at)}</td>
                  <td className="p-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="p-4 whitespace-nowrap text-muted">{o.delivered_at ? `Delivered ${d(o.delivered_at)}` : o.shipped_at ? `Shipped ${d(o.shipped_at)}` : "—"}</td>
                  <td className="p-4 text-right font-semibold mono">{rupees(Number(o.earning))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
