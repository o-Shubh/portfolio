import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import type { OrderStatus } from "@/lib/order-status";
import { rupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { CancelForm, RetryRefund } from "./CancelForm";
import { ReassignForm } from "./ReassignForm";

export const metadata: Metadata = { title: "Orders" };

const FILTERS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "open", label: "Not shipped", statuses: ["paid", "accepted", "printing", "printed", "packed"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "unpaid", label: "Unpaid", statuses: ["pending_payment"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];
  const q = typeof sp.q === "string" ? sp.q.replace(/[^A-Za-z0-9-]/g, "").slice(0, 30) : "";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, total, paid_at, created_at, ship_city, ship_state, ship_name, printer_id, cancel_reason, cancelled_by, refund_status, refund_id, razorpay_payment_id, printers(name), order_items(quantity, books(title))")
    .order("created_at", { ascending: false })
    .limit(100);
  query = q ? query.ilike("order_number", `%${q}%`) : query.in("status", filter.statuses);
  const [{ data: orders }, { data: printers }] = await Promise.all([
    query,
    supabase.from("printers").select("id, name, city").eq("active", true).order("name"),
  ]);

  return (
    <>
      <PageHeader title="Orders" intro="Every reader order, and which printer has it." />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/orders?status=${f.key}`}
            aria-current={!q && f.key === filter.key ? "true" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${
              !q && f.key === filter.key ? "bg-primary text-on-primary" : "bg-surface-2 text-fg"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <form action="/admin/orders" className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Order number
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Find order number, e.g. EIP-261014-" className="field" />
        <button className="btn-ghost">Find</button>
      </form>

      {!orders?.length ? (
        <div className="card text-center text-muted">No orders here.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{o.order_items.map((i) => `${i.books?.title} × ${i.quantity}`).join(", ")}</p>
                  <p className="text-sm text-muted">
                    <span className="id-mono">{o.order_number}</span> · {o.ship_name}, {o.ship_city} ({o.ship_state}) ·{" "}
                    {new Date(o.paid_at ?? o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold mono">{rupees(Number(o.total))}</p>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                <span className="text-muted">
                  Printer: <span className="font-semibold text-fg">{o.printers?.name ?? "not assigned"}</span>
                </span>
                {(o.status === "paid" || o.status === "accepted" || o.status === "printing") && (
                  <ReassignForm orderId={o.id} current={o.printer_id} printers={printers ?? []} />
                )}
              </div>
              {["pending_payment", "paid", "accepted", "printing", "printed", "packed"].includes(o.status) && (
                <div className="mt-3 border-t border-line pt-3">
                  <CancelForm orderId={o.id} paid={o.status !== "pending_payment"} />
                </div>
              )}
              {o.status === "cancelled" && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                  <span className="text-muted">
                    Cancelled by {o.cancelled_by ?? "—"}
                    {o.cancel_reason && `: ${o.cancel_reason}`}
                    {" · "}
                    Refund:{" "}
                    <span className={`font-medium ${o.refund_status === "failed" ? "text-danger" : "text-fg"}`}>
                      {o.razorpay_payment_id ? (o.refund_status ?? "not started") : "not needed"}
                    </span>
                    {o.refund_id && <span className="ml-1 mono">({o.refund_id})</span>}
                  </span>
                  {o.razorpay_payment_id && (o.refund_status === "failed" || !o.refund_status) && <RetryRefund orderId={o.id} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted">
        Order flow: Paid → Printing → Printed → Shipped → Delivered.
      </p>
    </>
  );
}
