"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Deletes the logged-in person's account. Readers (and authors who never created a book) can do this
 * themselves; their past orders stay for tax records but are unlinked from the account.
 */
export async function deleteMyAccount(confirm: string): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please log in again." };
  if (confirm.trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };

  const support = "Please contact us from the Contact page and we'll close it for you.";
  if (profile.role === "admin" || profile.role === "printer") return { error: `Admin and printer accounts can't be deleted here. ${support}` };

  const admin = createAdminClient();
  const [{ count: books }, { count: open }] = await Promise.all([
    admin.from("books").select("*", { count: "exact", head: true }).eq("author_id", profile.id),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", profile.id)
      .in("status", ["paid", "accepted", "printing", "printed", "packed", "shipped"]),
  ]);
  if (books) return { error: `Your account has books and earnings linked to it. ${support}` };
  if (open) return { error: "You have an order on its way. You can delete your account after it's delivered." };

  // Close unfinished checkouts. Cancelled (not deleted), so a payment that still arrives is refunded automatically.
  await admin
    .from("orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: "buyer", cancel_reason: "Account deleted" })
    .eq("buyer_id", profile.id)
    .eq("status", "pending_payment");
  if (profile.avatar_path) await admin.storage.from("avatars").remove([profile.avatar_path]);
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    console.error("Account deletion failed", profile.id, error);
    return { error: `Something went wrong. ${support}` };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
