import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { timeAgo } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { getBusiness, getPricingSettings, missingBusiness } from "@/lib/settings";
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
    count(supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "accepted", "printing", "printed", "packed"])),
    supabase.from("author_balances").select("balance"),
    supabase
      .from("books")
      .select("id, title, author_name, submitted_at")
      .eq("status", "in_review")
      .order("submitted_at", { ascending: true })
      .limit(5),
  ]);
  const [business, pricing] = await Promise.all([getBusiness(), getPricingSettings()]);
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const missing = missingBusiness(business);
  const checklist = [
    {
      done: missing.length === 0,
      label: "Business details added",
      hint: missing.length ? `Missing: ${missing.join(", ")}` : undefined,
      href: "/admin/settings#business",
    },
    { done: !pricing.rates.is_sample, label: "Real print rates set (untick “sample rates”)", href: "/admin/settings" },
    { done: printers > 0, label: "At least one active printer", href: "/admin/printers" },
    {
      done: keyId.startsWith("rzp_live_"),
      label: "Razorpay live keys",
      hint: keyId.startsWith("rzp_test_") ? "Test keys are set: payments are not real yet." : keyId ? undefined : "No keys yet: payments are pretend.",
    },
    { done: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET), label: "Razorpay webhook secret set" },
    { done: Boolean(process.env.NEXT_PUBLIC_SITE_URL), label: "Website address (NEXT_PUBLIC_SITE_URL) set" },
  ];
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
      {checklist.some((c) => !c.done) && (
        <section className="card mb-8" aria-labelledby="launch-heading">
          <h2 id="launch-heading" className="text-2xl">
            Launch checklist
          </h2>
          <p className="mt-1 text-sm text-muted">
            {checklist.filter((c) => c.done).length} of {checklist.length} done. Finish these before taking real orders.
          </p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {checklist.map((c) => {
              const body = (
                <>
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] ${c.done ? "bg-success text-bg" : "ring-1 ring-line-strong"}`}
                  >
                    {c.done ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className={`block ${c.done ? "text-muted line-through" : "font-medium"}`}>
                      <span className="sr-only">{c.done ? "Done: " : "To do: "}</span>
                      {c.label}
                    </span>
                    {!c.done && c.hint && <span className="block text-sm text-muted">{c.hint}</span>}
                  </span>
                </>
              );
              return (
                <li key={c.label}>
                  {c.href && !c.done ? (
                    <Link href={c.href} className="flex items-start gap-3 py-3 hover:bg-surface-2">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
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
          <Link href="/admin/review" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
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
