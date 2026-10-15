import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { becomeAuthor } from "@/app/actions/profile";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My orders" };

export default async function AccountHome() {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, order_items(quantity, books(title))")
    .eq("buyer_id", profile.id)
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <PageHeader title={`Namaste, ${profile.full_name?.split(" ")[0]}`} intro="Your book orders." />

      {!orders?.length ? (
        <div className="card text-center">
          <p className="font-semibold">No orders yet.</p>
          <Link href="/books" className="btn-primary mt-4">
            Browse the bookstore
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const titles = o.order_items.map((i) => i.books?.title).filter(Boolean).join(", ");
            const copies = o.order_items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{titles}</p>
                    <p className="text-sm text-muted">
                      {o.order_number} · {copies} {copies === 1 ? "copy" : "copies"} · {rupees(Number(o.total))} ·{" "}
                      {new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                    <div className="mt-2">
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {profile.role === "reader" && (
        <div className="card mt-8 ring-2 ring-accent/50">
          <h2 className="text-xl">Have a book in you?</h2>
          <p className="mt-1 text-muted">
            Publish in print across India. No upfront cost: we print each copy when someone orders it.
          </p>
          <form action={becomeAuthor} className="mt-4">
            <button type="submit" className="btn-primary">
              Start publishing
            </button>
          </form>
        </div>
      )}
    </>
  );
}
