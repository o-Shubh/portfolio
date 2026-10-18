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
          <p className="display text-lg">No orders yet.</p>
          <Link href="/books" className="btn-primary mt-4">
            Browse the bookstore
          </Link>
        </div>
      ) : (
        <ul className="group-list">
          {orders.map((o) => {
            const titles = o.order_items.map((i) => i.books?.title).filter(Boolean).join(", ");
            const copies = o.order_items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif font-semibold">{titles}</p>
                    <p className="text-sm text-muted">
                      <span className="mono">{o.order_number}</span> · {copies} {copies === 1 ? "copy" : "copies"} · <span className="mono">{rupees(Number(o.total))}</span> ·{" "}
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
        <div className="mt-8 rounded-[18px] bg-primary p-6 text-on-primary">
          <h2 className="display text-xl text-on-primary">Have a book in you?</h2>
          <p className="mt-1 text-on-primary/80">
            Publish in print across India. No upfront cost: we print each copy when someone orders it.
          </p>
          <form action={becomeAuthor} className="mt-4">
            <button type="submit" className="btn bg-white text-primary hover:bg-white/90">
              Start publishing
            </button>
          </form>
        </div>
      )}
    </>
  );
}
