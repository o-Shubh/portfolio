"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { deliver, retryEmails } from "@/lib/email";

export type EmailActionState = { error?: string; ok?: string } | undefined;

/** Retry one email now. */
export async function retryEmailAction(id: string): Promise<EmailActionState> {
  await requireRole(["admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Refresh and try again." };
  const r = await deliver(id);
  revalidatePath("/admin/emails");
  return r === "sent"
    ? { ok: "Sent." }
    : r === "skipped"
      ? { error: "Email isn't set up yet." }
      : r === "none"
        ? { ok: "Already handled." }
        : { error: "Still failing. See the error." };
}

/** Retry every failed or stuck email. */
export async function retryAllEmailsAction(): Promise<EmailActionState> {
  await requireRole(["admin"]);
  const r = await retryEmails();
  revalidatePath("/admin/emails");
  return { ok: `Sent ${r.sent}, failed ${r.failed}, skipped ${r.skipped}.` };
}
