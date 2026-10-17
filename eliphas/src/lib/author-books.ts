import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The logged-in author's book, or a 404 page if it isn't theirs. Cached per request. */
export const getOwnBookOr404 = cache(async (bookId: string) => {
  const profile = await requireRole(["author", "admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(bookId)) notFound();
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("author_id", profile.id)
    .maybeSingle();
  if (!book) notFound();
  return { profile, book };
});

export async function listOwnBooks() {
  const profile = await requireRole(["author", "admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, author_name, slug, status, language, mrp, cover_path, updated_at, review_note, sample_path")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });
  return data ?? [];
}
