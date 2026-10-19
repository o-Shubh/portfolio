"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type WishlistResult = { saved: boolean } | { error: string };

/** Saves a live book for later, or removes it. Saved books get price-drop and back-on-sale notices. */
export async function setSaved(bookId: string, save: boolean): Promise<WishlistResult> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Please log in to save books." };
  const supabase = await createClient();
  if (!save) {
    await supabase.from("wishlist").delete().eq("user_id", me.id).eq("book_id", bookId);
  } else {
    const { data: book } = await createAdminClient().from("books").select("mrp, status").eq("id", bookId).maybeSingle();
    if (!book || book.status !== "published") return { error: "This book isn't available right now." };
    const { error } = await supabase
      .from("wishlist")
      .upsert({ user_id: me.id, book_id: bookId, price_at_save: book.mrp }, { onConflict: "user_id,book_id", ignoreDuplicates: true });
    if (error) return { error: "Could not save. Please try again." };
  }
  revalidatePath("/account/saved");
  return { saved: save };
}
