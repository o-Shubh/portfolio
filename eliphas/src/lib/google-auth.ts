import "server-only";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Whether "Continue with Google" is switched on in Supabase (Authentication → Providers → Google).
 * The button only appears once it is, so there's never a button that leads nowhere. Checked every 5 minutes.
 */
export async function googleSignInEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl()}/auth/v1/settings`, { headers: { apikey: supabasePublishableKey() }, next: { revalidate: 300 } });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return Boolean(settings.external?.google);
  } catch {
    return false;
  }
}
