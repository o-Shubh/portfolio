import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { CancelRunButton, SettleForm } from "../../RunForms";

export const metadata: Metadata = { title: "Payout run" };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "");

export default async function PayoutRunPage({ params }: PageProps<"/admin/payouts/run/[id]">) {
  await requireRole(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const [{ data: run }, { data: items }] = await Promise.all([
    db.from("payout_runs").select("*").eq("id", id).maybeSingle(),
    db
      .from("payouts")
      .select("id, amount, status, upi, reference, paid_at, profiles!payouts_author_id_fkey(full_name, phone)")
      .eq("run_id", id)
      .order("amount", { ascending: false }),
  ]);
  if (!run) notFound();
  const pending = (items ?? []).filter((i) => i.status === "pending");
  const paidTotal = (items ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <Link href="/admin/payouts" className="mb-2 inline-flex min-h-10 items-center text-sm text-muted hover:text-fg">
        ← Payouts
      </Link>
      <PageHeader
        title="Payout run"
        intro={`Started ${when(run.created_at)} · minimum ${rupees(Number(run.minimum))} · ${run.authors} ${run.authors === 1 ? "author" : "authors"} · ${rupees(Number(run.total), true)}`}
        action={run.status === "open" ? <CancelRunButton runId={run.id} /> : undefined}
      />
      {run.status === "open" ? (
        <ol className="notice-info mb-6 list-decimal space-y-1 pl-9">
          <li>
            <a href={`/admin/payouts/run/${run.id}/csv`} className="font-medium underline">
              Download the payout sheet (CSV)
            </a>{" "}
            and pay each author by UPI or a bank bulk transfer.
          </li>
          <li>Enter each payment&apos;s reference (UTR) and mark it paid. The run closes when nothing is left.</li>
        </ol>
      ) : (
        <p className="notice-success mb-6">
          This run is {run.status}. {rupees(paidTotal, true)} paid.
        </p>
      )}
      {!items?.length ? (
        <p className="card text-center text-muted">Nobody was owed at least {rupees(Number(run.minimum))} with a UPI ID when this run started.</p>
      ) : (
        <ul className="group-list">
          {items.map((p) => (
            <li key={p.id} className="space-y-2 px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.profiles?.full_name ?? "Author"}</p>
                  <p className="text-sm text-muted">
                    UPI <span className="mono select-all">{p.upi}</span>
                    {p.reference ? (
                      <>
                        {" "}
                        · ref <span className="id-mono">{p.reference}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono font-semibold">{rupees(Number(p.amount), true)}</span>
                  <span
                    className={`badge capitalize ${p.status === "paid" ? "bg-tint-success text-success" : p.status === "pending" ? "bg-tint-warn text-marigold-fg" : "bg-surface-3 text-muted"}`}
                  >
                    {p.status === "pending" ? "To pay" : p.status}
                  </span>
                </div>
              </div>
              {p.status === "pending" && run.status === "open" && <SettleForm runId={run.id} payoutId={p.id} />}
            </li>
          ))}
        </ul>
      )}
      {pending.length > 0 && <p className="mt-3 text-sm text-muted">{pending.length} still to pay.</p>}
    </>
  );
}
