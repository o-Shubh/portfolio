import type { Metadata } from "next";
import Link from "next/link";
import { checkOrderRefundAction, checkPaymentRefundAction, retryOrderRefundAction, retryPaymentRefundAction } from "@/app/actions/refunds";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { rupees } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { RefundButtons } from "./RefundButtons";

export const metadata: Metadata = { title: "Refunds" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—");
const LABEL: Record<string, { text: string; tone: string }> = {
  none: { text: "Not started", tone: "bg-tint-danger text-danger" },
  requested: { text: "Sent, no reply yet", tone: "bg-tint-warn text-marigold-fg" },
  pending: { text: "Processing at Razorpay", tone: "bg-tint-info text-accent-fg" },
  failed: { text: "Failed", tone: "bg-tint-danger text-danger" },
  processed: { text: "Refunded", tone: "bg-tint-success text-success" },
};
const Badge = ({ s }: { s: string }) => <span className={`badge whitespace-nowrap ${LABEL[s]?.tone ?? "bg-surface-3"}`}>{LABEL[s]?.text ?? s}</span>;

export default async function RefundsPage() {
  await requireRole(["admin"]);
  const db = createAdminClient();
  const [orders, ledger, recent, recentOrders] = await Promise.all([
    db
      .from("orders")
      .select("id, order_number, total, payment_mode, refund_status, refund_id, cancelled_at, cancel_reason")
      .eq("status", "cancelled")
      .not("razorpay_payment_id", "is", null)
      .or("refund_status.is.null,refund_status.in.(requested,pending,failed)")
      .order("cancelled_at", { ascending: false })
      .limit(100),
    db
      .from("payment_refunds")
      .select("id, amount_paise, status, error, reason, created_at, updated_at, razorpay_refund_id, payments(description, mode, receipt_number)")
      .neq("status", "processed")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("payment_refunds")
      .select("id, amount_paise, processed_at, payments(description)")
      .eq("status", "processed")
      .order("processed_at", { ascending: false })
      .limit(10),
    db
      .from("orders")
      .select("id, order_number, refund_amount, total, refunded_at")
      .eq("refund_status", "processed")
      .order("refunded_at", { ascending: false, nullsFirst: false })
      .limit(10),
  ]);
  const done = [
    ...(recent.data ?? []).map((r) => ({
      key: r.id,
      label: r.payments?.description ?? "Payment",
      at: r.processed_at,
      amount: formatPaise(r.amount_paise, true),
    })),
    ...(recentOrders.data ?? []).map((o) => ({
      key: o.id,
      label: `Order ${o.order_number}`,
      at: o.refunded_at,
      amount: rupees(Number(o.refund_amount ?? o.total), true),
    })),
  ]
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, 10);
  const open = (orders.data?.length ?? 0) + (ledger.data?.length ?? 0);

  return (
    <>
      <PageHeader
        title="Refunds"
        intro="Refunds that need attention. A refund counts only when Razorpay confirms it. Check status asks Razorpay what happened; Retry first makes sure the money wasn't already returned."
      />
      {orders.error || ledger.error ? (
        <p role="alert" className="notice-danger">
          Couldn&apos;t load refunds. Check that migration 000021 has been applied.
        </p>
      ) : (
        <div className="space-y-10">
          {open === 0 && <p className="notice-success">Nothing needs attention. Every refund has been confirmed by Razorpay.</p>}

          <section aria-labelledby="orders-h">
            <h2 id="orders-h" className="text-xl">
              Book orders
            </h2>
            <p className="mt-1 text-sm text-muted">Cancelled orders that were paid and aren&apos;t refunded yet.</p>
            {!orders.data?.length ? (
              <p className="mt-3 text-sm text-muted">None.</p>
            ) : (
              <ul className="group-list mt-3">
                {orders.data.map((o) => {
                  const s = o.refund_status ?? "none";
                  const live = o.payment_mode === "razorpay";
                  return (
                    <li key={o.id} className="space-y-2 px-4 py-3 md:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">
                            <span className="id-mono">{o.order_number}</span> · <span className="mono">{rupees(Number(o.total), true)}</span>
                          </p>
                          <p className="text-sm text-muted">
                            Cancelled {when(o.cancelled_at)}
                            {o.cancel_reason ? ` · ${o.cancel_reason}` : ""}
                            {o.refund_id ? (
                              <>
                                {" "}
                                · <span className="id-mono">{o.refund_id}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <Badge s={s} />
                      </div>
                      <RefundButtons
                        check={live && s !== "none" ? checkOrderRefundAction.bind(null, o.id) : undefined}
                        retry={s === "failed" || s === "none" ? retryOrderRefundAction.bind(null, o.id) : undefined}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="payments-h">
            <h2 id="payments-h" className="text-xl">
              Pro and service payments
            </h2>
            <p className="mt-1 text-sm text-muted">Refunds waiting for Razorpay, or that failed.</p>
            {!ledger.data?.length ? (
              <p className="mt-3 text-sm text-muted">None.</p>
            ) : (
              <ul className="group-list mt-3">
                {ledger.data.map((r) => (
                  <li key={r.id} className="space-y-2 px-4 py-3 md:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {r.payments?.description ?? "Payment"} · <span className="mono">{formatPaise(r.amount_paise, true)}</span>
                        </p>
                        <p className="text-sm text-muted">
                          {r.payments?.receipt_number && (
                            <>
                              <span className="id-mono">{r.payments.receipt_number}</span> ·{" "}
                            </>
                          )}
                          Requested {when(r.created_at)}
                          {r.reason ? ` · ${r.reason}` : ""}
                        </p>
                        {r.error && <p className="mt-1 text-sm text-danger">{r.error}</p>}
                      </div>
                      <Badge s={r.status} />
                    </div>
                    <RefundButtons
                      check={r.payments?.mode === "razorpay" ? checkPaymentRefundAction.bind(null, r.id) : undefined}
                      retry={r.status === "failed" ? retryPaymentRefundAction.bind(null, r.id) : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {done.length > 0 && (
            <section aria-labelledby="recent-h">
              <h2 id="recent-h" className="text-lg">
                Recently refunded
              </h2>
              <ul className="group-list mt-3 text-sm">
                {done.map((r) => (
                  <li key={r.key} className="group-row justify-between">
                    <span className="min-w-0 truncate">{r.label}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-muted">{when(r.at)}</span>
                      <span className="mono">{r.amount}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-sm text-muted">
            Book order refunds are also shown on{" "}
            <Link href="/admin/orders?status=cancelled" className="underline">
              Orders
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );
}
