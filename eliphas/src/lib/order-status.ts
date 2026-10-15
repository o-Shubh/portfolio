// Order statuses in plain words, shared by reader, printer and admin screens.
import type { Database } from "@/lib/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string; reader: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "bg-surface-2 text-muted", reader: "Payment not completed." },
  paid: { label: "Paid", tone: "bg-accent/20 text-fg", reader: "Order confirmed. Sent to the printer." },
  printing: { label: "Printing", tone: "bg-accent/20 text-fg", reader: "Your book is being printed." },
  printed: { label: "Printed", tone: "bg-success/15 text-success", reader: "Printed and packed. Handing to courier." },
  shipped: { label: "Shipped", tone: "bg-success/15 text-success", reader: "On its way." },
  delivered: { label: "Delivered", tone: "bg-success/15 text-success", reader: "Delivered. Happy reading!" },
  cancelled: { label: "Cancelled", tone: "bg-danger/15 text-danger", reader: "This order was cancelled." },
};

/** Steps shown on the tracking timeline, in order. */
export const TRACKING_STEPS: { status: OrderStatus; label: string; at: "paid_at" | "accepted_at" | "printed_at" | "shipped_at" | "delivered_at" }[] = [
  { status: "paid", label: "Order confirmed", at: "paid_at" },
  { status: "printing", label: "Printing", at: "accepted_at" },
  { status: "printed", label: "Printed and packed", at: "printed_at" },
  { status: "shipped", label: "Shipped", at: "shipped_at" },
  { status: "delivered", label: "Delivered", at: "delivered_at" },
];

/** What a printer can do next with an order. */
export const PRINTER_NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "printing", label: "Accept and start printing" },
  printing: { to: "printed", label: "Mark as printed" },
  printed: { to: "shipped", label: "Mark as shipped" },
  shipped: { to: "delivered", label: "Mark as delivered" },
};
