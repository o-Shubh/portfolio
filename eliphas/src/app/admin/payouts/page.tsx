import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { rupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PayoutForm } from "./PayoutForm";
import { StartRunForm } from "./RunForms";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data: balances }, { data: history }, { data: openRun }] = await Promise.all([
    supabase.from("author_balances").select("*").order("balance", { ascending: false }),
    supabase
      .from("payouts")
      .select("id, amount, reference, note, paid_at, created_at, status, author_id, profiles!payouts_author_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("payout_runs").select("id, authors, total, created_at").eq("status", "open").maybeSingle(),
  ]);

  const owed = (balances ?? []).reduce((sum, b) => sum + Math.max(0, Number(b.balance)), 0);

  return (
    <>
      <PageHeader title="Payouts" intro="Author earnings from paid orders, minus what has already been paid. Pay by UPI or bank, then record it here." />
      <div className="card mb-6">
        <p className="text-sm text-muted">Total owed to authors</p>
        <p className="mono text-3xl font-semibold tracking-tight">{rupees(Math.round(owed * 100) / 100)}</p>
      </div>

      <section className="card mb-6" aria-labelledby="run-h">
        <h2 id="run-h" className="text-xl">
          Payout run
        </h2>
        {openRun ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">
              Open run: {openRun.authors} {openRun.authors === 1 ? "author" : "authors"}, <span className="mono">{rupees(Number(openRun.total), true)}</span>
            </p>
            <Link href={`/admin/payouts/run/${openRun.id}`} className="btn-primary">
              Continue payout run
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 mb-4 text-sm text-muted">
              Pays everyone owed at least the minimum on delivered orders who has added a UPI ID. You get one sheet to pay from, then mark each payment paid
              with its reference.
            </p>
            <StartRunForm />
          </>
        )}
      </section>

      <h2 className="mb-3 text-xl">Balances</h2>
      {!balances?.length ? (
        <div className="card text-muted">No authors yet.</div>
      ) : (
        <ul className="space-y-3">
          {balances.map((b) => (
            <li key={b.author_id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{b.full_name ?? "Unnamed author"}</p>
                  <p className="text-sm text-muted">
                    {formatPhone(b.phone)} · UPI: {b.payout_upi ?? <span className="text-danger">not added yet</span>}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-muted">Balance</p>
                  <p className="mono text-2xl font-medium">{rupees(Number(b.balance))}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Copies sold</dt>
                  <dd className="font-medium mono">{b.copies_sold}</dd>
                </div>
                <div>
                  <dt className="text-muted">Earned</dt>
                  <dd className="font-medium mono">{rupees(Number(b.earned))}</dd>
                </div>
                <div>
                  <dt className="text-muted">Paid</dt>
                  <dd className="font-medium mono">{rupees(Number(b.paid))}</dd>
                </div>
              </dl>
              {Number(b.balance) > 0 && b.author_id && (
                <details className="mt-4 border-t border-line pt-3">
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Record a payout</summary>
                  <PayoutForm authorId={b.author_id} balance={Number(b.balance)} />
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-10 text-xl">Recent payouts</h2>
      {!history?.length ? (
        <div className="card text-muted">No payouts yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Author</th>
                <th className="p-3 text-right font-medium">Amount</th>
                <th className="p-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                  <td className="p-3">{p.profiles?.full_name}</td>
                  <td className="p-3 text-right mono">{rupees(Number(p.amount), true)}</td>
                  <td className="p-3">
                    {p.reference}
                    {p.note && <span className="block text-xs text-muted">{p.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
