import { ORDER_STATUS, type OrderStatus } from "@/lib/order-status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}
