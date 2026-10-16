import "server-only";
import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Pre-fill the delivery form from the reader's last order, or their profile. */
export async function addressDefaults(profile: Profile): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("orders")
    .select("ship_name, ship_phone, ship_line1, ship_line2, ship_city, ship_state, ship_pincode")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    ship_name: last?.ship_name ?? profile.full_name ?? "",
    ship_phone: (last?.ship_phone ?? profile.phone ?? "").slice(-10),
    ship_line1: last?.ship_line1 ?? "",
    ship_line2: last?.ship_line2 ?? "",
    ship_city: last?.ship_city ?? profile.city ?? "",
    ship_state: last?.ship_state ?? profile.state ?? "",
    ship_pincode: last?.ship_pincode ?? profile.pincode ?? "",
  };
}
