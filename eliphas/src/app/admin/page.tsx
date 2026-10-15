import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { timeAgo } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [waiting, live, printers, ordersThisMonth, toPrint, balances, queue] = await Promise.all([
    count(supabase.from("books").select("*", { count: "exact", head: true }).eq("status", "in_review")),
    count(supabase.from("books").select("*", { count: "exact", head: true }).eq("status", "published")),
    count(supabase.from("printers").select("*", { count: "exact", head: true }).eq("active", true)),
    count(
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("paid_at", monthStart)
        .not("status", "in", "(pending_payment,cancelled)"),
    ),
    count(supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "printing", "printed"])),
    supabase.from("author_balances").select("balance"),
    supabase
      .from("books")
      .select("id, title, author_name, submitted_at")
      .eq("status", "in_review")
      .order("submitted_at", { ascending: true })
      .limit(5),
  ]);
  const owed = (balances.data ?? []).reduce((s, b) => s + Math.max(0, Number(b.balance)), 0);

  const stats = [
    { label: "Waiting for review", value: waiting, href: "/admin/review", alert: waiting > 0 },
    { label: "Live books", value: live, href: "/admin/review?status=published" },
    { label: "Orders this month", value: ordersThisMonth },
    { label: "Orders not yet shipped", value: toPrint },
    { label: "Active printers", value: printers, href: "/admin/printers" },
    { label: "Owed to authors", value: rupees(Math.round(owed)), href: "/admin/payouts" },
  ];

  return (
    <>
      <PageHeader title="Admin overview" />
      <dl className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => {
          const inner = (
            <>
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className={`mt-1 font-heading text-3xl tracking-tight tabular-nums ${s.alert ? "text-accent-fg" : ""}`}>{s.value}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="card transition hover:-translate-y-0.5 hover:shadow-lift">
              {inner}
            </Link>
          ) : (
            <div key={s.label} className="card">
              {inner}
            </div>
          );
        })}
      </dl>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg">Next in the review queue</h2>
          <Link href="/admin/review" className="text-sm font-semibold underline">
            See all
          </Link>
        </div>
        {!queue.data?.length ? (
          <p className="mt-2 text-muted">Nothing waiting. All caught up!</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {queue.data.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/books/${b.id}`} className="min-w-0 truncate font-medium hover:underline">
                  {b.title} <span className="text-muted">· {b.author_name}</span>
                </Link>
                <span className="shrink-0 text-sm text-muted">{timeAgo(b.submitted_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
