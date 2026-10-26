"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { ADULT_COOKIE } from "@/lib/mature";
import { createAdminClient } from "@/lib/supabase/admin";

/** The visitor confirms they are 18 or older: 18+ books are shown on this browser, and it's recorded on their account. */
export async function confirmAdult(): Promise<{ ok: true }> {
  (await cookies()).set(ADULT_COOKIE, "1", { maxAge: 365 * 86400, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  const me = await getCurrentProfile();
  if (me && !me.adult_confirmed_at) await createAdminClient().from("profiles").update({ adult_confirmed_at: new Date().toISOString() }).eq("id", me.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Stops showing 18+ books on this browser. */
export async function hideAdult(): Promise<{ ok: true }> {
  (await cookies()).delete(ADULT_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true };
}
