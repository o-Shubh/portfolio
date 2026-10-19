"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type RunState = { error?: string; ok?: string } | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const done = (runId?: string) => {
  revalidatePath("/admin/payouts");
  if (runId) revalidatePath(`/admin/payouts/run/${runId}`);
};

/** Start a payout run for everyone owed at least the minimum (on delivered orders) who has a UPI ID. */
export async function startPayoutRun(_: RunState, fd: FormData): Promise<RunState> {
  const me = await requireRole(["admin"]);
  const minimum = Math.round(Number(fd.get("minimum") ?? 0) * 100) / 100;
  if (!Number.isFinite(minimum) || minimum < 0 || minimum > 100000) return { error: "Enter a minimum amount of ₹0 or more." };
  const { data: runId, error } = await createAdminClient().rpc("create_payout_run", { p_minimum: minimum, p_actor: me.id });
  if (error || !runId)
    return { error: error?.message.includes("open payout run") ? "Finish or cancel the open payout run first." : "Could not start the payout run." };
  await logAudit(me.id, "payout_run.created", "payout_run", runId, { minimum });
  done(runId);
  redirect(`/admin/payouts/run/${runId}`);
}

/** Mark one payout in the run as paid (with the UTR) or remove it from the run. */
export async function settleRunPayout(runId: string, payoutId: string, _: RunState, fd: FormData): Promise<RunState> {
  const me = await requireRole(["admin"]);
  if (!UUID.test(runId) || !UUID.test(payoutId)) return { error: "Refresh and try again." };
  const paid = fd.get("action") !== "cancel";
  const reference = String(fd.get("reference") ?? "")
    .trim()
    .slice(0, 80);
  if (paid && reference.length < 4) return { error: "Enter the payment reference (UTR) from your bank or UPI app." };
  const { error } = await createAdminClient().rpc("settle_run_payout", { p_payout: payoutId, p_paid: paid, p_reference: reference });
  if (error) return { error: error.message.includes("not waiting") ? "This payout was already handled. Refresh the page." : "Could not save." };
  await logAudit(me.id, paid ? "payout.paid" : "payout.cancelled", "payout", payoutId, { run: runId, reference: paid ? reference : null });
  done(runId);
  return { ok: paid ? "Marked paid." : "Removed from this run." };
}

/** Cancel the run: payouts not yet marked paid are released. */
export async function cancelPayoutRun(runId: string): Promise<RunState> {
  const me = await requireRole(["admin"]);
  if (!UUID.test(runId)) return { error: "Refresh and try again." };
  const { error } = await createAdminClient().rpc("cancel_payout_run", { p_run: runId });
  if (error) return { error: "Could not cancel the run." };
  await logAudit(me.id, "payout_run.cancelled", "payout_run", runId);
  done(runId);
  return { ok: "Payout run cancelled. Unpaid amounts are back in the balances." };
}
