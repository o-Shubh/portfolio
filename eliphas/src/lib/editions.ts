import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Server-only (never a server action): callers must already have checked the admin role.

/**
 * Assigns the book's EEID, or returns the one it already has. Safe to call again: the database locks the row,
 * so retries, double clicks and concurrent approvals all get the same ID.
 */
export async function ensureEditionId(bookId: string, adminId: string, via: "approval" | "backfill" = "approval") {
  const { data, error } = await createAdminClient().rpc("assign_eeid", { p_book: bookId, p_admin: adminId, p_via: via });
  if (error || typeof data !== "string") return { error: error?.message.includes("removed") ? "This edition was removed and can't get an Edition ID." : "Could not assign the Edition ID. Try again." };
  return { eeid: data };
}
