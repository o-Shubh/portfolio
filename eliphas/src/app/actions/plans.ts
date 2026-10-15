"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getCommissionTerms, logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlanActionState = { error?: string; ok?: string } | undefined;

/** The author accepts the current author terms (commission rates). Recorded with version and time. */
export async function acceptAuthorTerms(_prev: PlanActionState, fd: FormData): Promise<PlanActionState> {
  const profile = await requireRole(["author", "admin"]);
  if (fd.get("agree") !== "on") return { error: "Tick the box to accept the terms." };
  const terms = await getCommissionTerms();
  if (String(fd.get("version")) !== terms.version) return { error: "The terms have changed. Refresh the page and read them again." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ author_terms_version: terms.version, author_terms_accepted_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) return { error: "Could not save. Please try again." };
  await logAudit(profile.id, "author_terms.accepted", "profile", profile.id, { version: terms.version, previous: profile.author_terms_version });
  revalidatePath("/author", "layout");
  return { ok: "Thanks. The current terms now apply to your new sales." };
}
