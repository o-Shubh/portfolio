"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/** One-click unsubscribe from the weekly email, by the token in its link (no login needed). */
export async function unsubscribeDigest(token: string): Promise<{ ok: true } | { error: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "This unsubscribe link isn't valid." };
  const { data } = await createAdminClient().from("profiles").update({ weekly_digest: false }).eq("digest_token", token).select("id");
  return data?.length ? { ok: true } : { error: "This unsubscribe link isn't valid." };
}
