import { ArrowLeft, CheckCircle2, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { requireRole } from "@/lib/auth";
import { coverUrl } from "@/lib/books";
import { ORDER_STATUS } from "@/lib/order-status";
import { formatPhone } from "@/lib/phone";
import { rupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { CancelOrder } from "./CancelOrder";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[id]">) {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const { id } = await params;
  const { paid } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("*, order_items(id, quantity, unit_price, books(title, author_name, slug, cover_path))")
    .eq("id", id)
    .eq("buyer_id", profile.id)
    .maybeSingle();
  if (!o) notFound();

  return (
    <>
      <Link href="/account" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My orders
      </Link>

      {paid && o.status !== "pending_payment" && (
        <div role="status" className="card mt-3 flex items-center gap-3 ring-2 ring-success/40">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-heading text-2xl">Thank you! Your order is confirmed.</p>
            <p className="text-muted">We&apos;ll print your copy fresh and send it to you.</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">Order {o.order_number}</h1>
        <OrderStatusBadge status={o.status} />
      </div>
      <p className="mt-1 text-muted">{ORDER_STATUS[o.status].reader}</p>

      {o.status === "cancelled" && (
        <div className="card mt-6 space-y-1 text-sm">
          {o.cancel_reason && o.cancelled_by === "admin" && (
            <p>
              <span className="text-muted">Reason:</span> {o.cancel_reason}
            </p>
          )}
          {o.refund_status && (
            <p>
              <span className="text-muted">Refund of {rupees(Number(o.refund_amount ?? o.total))}:</span>{" "}
              {o.refund_status === "processed"
                ? "sent to your original payment method. Banks usually show it within 5–7 working days."
                : o.refund_status === "pending"
                  ? "in progress. It usually reaches you within 5–7 working days."
                  : "being processed by our team. We'll contact you if we need anything."}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-5 text-xl">Tracking</h2>
            <OrderTimeline order={o} />
            {o.tracking_number && (
              <p className="mt-6 flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                <Truck className="h-4 w-4 shrink-0" aria-hidden />
                {o.courier}: <span className="font-semibold tabular-nums select-all">{o.tracking_number}</span>
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card space-y-4">
            {o.order_items.map((it) => (
              <div key={it.id} className="flex gap-3">
                <div className="w-14 shrink-0">
                  {it.books && (
                    <BookCover title={it.books.title} author={it.books.author_name} slug={it.books.slug} src={coverUrl(it.books.cover_path)} size="xs" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{it.books?.title}</p>
                  <p className="text-sm text-muted">
                    {it.quantity} × {rupees(Number(it.unit_price))}
                  </p>
                </div>
              </div>
            ))}
            <dl className="space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-muted">
                <dt>Books</dt>
                <dd>{rupees(Number(o.subtotal))}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Shipping</dt>
                <dd>{Number(o.shipping) === 0 ? "Free" : rupees(Number(o.shipping))}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Paid</dt>
                <dd>{rupees(Number(o.total))}</dd>
              </div>
            </dl>
          </section>
          {o.status === "paid" && (
            <section className="space-y-2">
              <CancelOrder orderId={o.id} />
              <p className="text-xs text-muted">Free cancellation until the printer starts on your copy.</p>
            </section>
          )}
          <section className="card text-sm">
            <h2 className="mb-2 text-lg">Delivering to</h2>
            <p className="font-semibold">{o.ship_name}</p>
            <p className="text-muted">
              {o.ship_line1}
              {o.ship_line2 && `, ${o.ship_line2}`}
              <br />
              {o.ship_city}, {o.ship_state} {o.ship_pincode}
              <br />
              {formatPhone(o.ship_phone)}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
