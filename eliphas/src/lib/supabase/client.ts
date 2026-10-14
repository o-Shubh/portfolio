"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/** Supabase client for code that runs in the browser (login form, file uploads). */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
