import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseUrl } from "@/lib/env";

/**
 * Supabase client with full access (skips Row Level Security).
 * SERVER ONLY. Use it only after checking who the user is, e.g. when creating
 * orders after a verified payment.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing environment variable SUPABASE_SECRET_KEY.");
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
