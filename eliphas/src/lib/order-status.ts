// Order statuses in plain words, shared by reader, printer and admin screens.
import type { Database } from "@/lib/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string; reader: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "bg-surface-2 text-muted", reader: "Payment not completed." },
  paid: { label: "Paid", tone: "bg-accent/20 text-fg", reader: "Order confirmed. Sent to the printer." },
  accepted: { label: "Accepted", tone: "bg-accent/20 text-fg", reader: "The printer has accepted your order." },
  printing: { label: "Printing", tone: "bg-accent/20 text-fg", reader: "Your book is being printed." },
  printed: { label: "Printed", tone: "bg-success/15 text-success", reader: "Printed and packed. Handing to courier." },
  packed: { label: "Packed", tone: "bg-success/15 text-success", reader: "Printed and packed. Handing to courier." },
  shipped: { label: "Shipped", tone: "bg-success/15 text-success", reader: "On its way." },
  delivered: { label: "Delivered", tone: "bg-success/15 text-success", reader: "Delivered. Happy reading!" },
  cancelled: { label: "Cancelled", tone: "bg-danger/15 text-danger", reader: "This order was cancelled." },
};

/** Steps shown on the tracking timeline, in order. */
export type StepTime = "paid_at" | "accepted_at" | "printing_at" | "packed_at" | "printed_at" | "shipped_at" | "delivered_at";
export const TRACKING_STEPS: { status: OrderStatus; label: string; at: StepTime; fallback?: StepTime }[] = [
  { status: "paid", label: "Order confirmed", at: "paid_at" },
  { status: "accepted", label: "Accepted by the printer", at: "accepted_at" },
  { status: "printing", label: "Printing", at: "printing_at", fallback: "accepted_at" },
  { status: "packed", label: "Printed and packed", at: "packed_at", fallback: "printed_at" },
  { status: "shipped", label: "Shipped", at: "shipped_at" },
  { status: "delivered", label: "Delivered", at: "delivered_at" },
];

/** What a printer can do next with an order. */
export const PRINTER_NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "accepted", label: "Accept order" },
  accepted: { to: "printing", label: "Start printing" },
  printing: { to: "packed", label: "Mark as printed and packed" },
  printed: { to: "shipped", label: "Mark as shipped" }, // orders from before the "packed" step
  packed: { to: "shipped", label: "Mark as shipped" },
  shipped: { to: "delivered", label: "Mark as delivered" },
};

/** Orders still with the printer (not yet shipped). */
export const OPEN_STATUSES: OrderStatus[] = ["paid", "accepted", "printing", "printed", "packed"];
