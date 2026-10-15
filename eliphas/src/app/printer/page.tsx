import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { timeAgo } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import type { OrderStatus } from "@/lib/order-status";
import { myPrinter } from "@/lib/printer";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Print jobs" };

const TABS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "new", label: "New", statuses: ["paid"] },
  { key: "printing", label: "Printing", statuses: ["printing"] },
  { key: "to-ship", label: "To ship", statuses: ["printed"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "done", label: "Delivered", statuses: ["delivered"] },
];

export default async function PrinterHome({ searchParams }: PageProps<"/printer">) {
  const profile = await requireRole(["printer", "admin"]);
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];
  const printer = await myPrinter(profile.id);

  if (!printer) {
    return (
      <>
        <PageHeader title="Print jobs" />
        <div className="card ring-2 ring-accent/50">
          {profile.role === "admin"
            ? "You're an admin. Use Admin → Orders to see every printer's jobs."
            : "Your login isn't linked to a print shop yet. Ask the admin to add your phone number in the printer list."}
        </div>
      </>
    );
  }

  // Access was checked above (this printer's own id); full access lets us show book details
  // even if a book was unpublished after the order was placed.
  const admin = createAdminClient();
  const [{ data: orders }, { data: counts }] = await Promise.all([
    admin
      .from("orders")
      .select("id, order_number, status, paid_at, ship_city, ship_state, order_items(quantity, books(title))")
      .eq("printer_id", printer.id)
      .in("status", tab.statuses)
      .order("paid_at", { ascending: tab.key !== "done" && tab.key !== "shipped" })
      .limit(100),
    admin.from("orders").select("status").eq("printer_id", printer.id).in("status", ["paid", "printing", "printed"]),
  ]);
  const countFor = (s: OrderStatus[]) => (counts ?? []).filter((c) => s.includes(c.status)).length;

  return (
    <>
      <PageHeader title="Print jobs" intro={`${printer.name} · ${printer.city}, ${printer.state}`} />
      <nav aria-label="Job status" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const n = t.key === "shipped" || t.key === "done" ? 0 : countFor(t.statuses);
          return (
            <Link
              key={t.key}
              href={`/printer?tab=${t.key}`}
              aria-current={t.key === tab.key ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                t.key === tab.key ? "bg-primary text-on-primary" : "bg-surface-2 text-fg"
              }`}
            >
              {t.label}
              {n > 0 && <span className="rounded-full bg-accent px-2 text-xs text-on-accent">{n}</span>}
            </Link>
          );
        })}
      </nav>

      {!orders?.length ? (
        <div className="card text-center text-muted">No jobs here.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const copies = o.order_items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={o.id}>
                <Link href={`/printer/orders/${o.id}`} className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {o.order_items.map((i) => i.books?.title).join(", ")}
                    </p>
                    <p className="text-sm text-muted">
                      {o.order_number} · {copies} {copies === 1 ? "copy" : "copies"} · to {o.ship_city}, {o.ship_state}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <OrderStatusBadge status={o.status} />
                      <span className="text-xs text-muted">paid {timeAgo(o.paid_at)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
