"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type ContentActionState = { error?: string; ok?: string } | undefined;
const CATEGORIES = ["language", "hate", "adult", "violence", "allow"] as const;

/** Adds a word or phrase to a list, or to the allowed list (to stop false alarms). */
export async function addContentTerm(_prev: ContentActionState, fd: FormData): Promise<ContentActionState> {
  const me = await requireRole(["admin"]);
  const term = String(fd.get("term") ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFC");
  const category = String(fd.get("category") ?? "") as (typeof CATEGORIES)[number];
  if (!CATEGORIES.includes(category)) return { error: "Choose a list." };
  if (term.length < 2 || term.length > 80) return { error: "Enter a word or phrase (2 to 80 characters)." };
  const { error } = await createAdminClient()
    .from("content_terms")
    .upsert({ term, category, created_by: me.id }, { onConflict: "term,category", ignoreDuplicates: true });
  if (error) return { error: "Could not add it." };
  await logAudit(me.id, "content_terms.add", "content_term", null, { term, category });
  revalidatePath("/admin/content");
  return { ok: `Added "${term}". New checks use it; run a book's check again to apply it there.` };
}

export async function removeContentTerm(term: string, category: string): Promise<ContentActionState> {
  const me = await requireRole(["admin"]);
  await createAdminClient().from("content_terms").delete().eq("term", term).eq("category", category);
  await logAudit(me.id, "content_terms.remove", "content_term", null, { term, category });
  revalidatePath("/admin/content");
  return { ok: "Removed." };
}
