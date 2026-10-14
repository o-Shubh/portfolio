import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  reader: "/account",
  author: "/author",
  printer: "/printer",
  admin: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  reader: "Reader",
  author: "Author",
  printer: "Printer",
  admin: "Admin",
};

/** The logged-in person's profile, or null. Cached for one request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  // getUser() checks the login with Supabase, so it can't be faked with a cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
});

/**
 * Use at the top of a private layout or page. Sends the visitor away unless
 * they are logged in, have finished onboarding, and have one of the roles.
 */
export async function requireRole(allowed: Role[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.full_name) redirect("/onboarding");
  if (!allowed.includes(profile.role)) redirect(ROLE_HOME[profile.role]);
  return profile;
}
