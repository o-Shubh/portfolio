import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The print shop linked to the logged-in printer, or null. */
export async function myPrinter(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("printers").select("id, name, city, state").eq("user_id", profileId).maybeSingle();
  return data;
}
