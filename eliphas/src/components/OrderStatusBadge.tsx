import { ORDER_STATUS, type OrderStatus } from "@/lib/order-status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>;
}
