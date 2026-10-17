import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Book = Database["public"]["Tables"]["books"]["Row"];

/** Columns safe to show the public (no file paths of private manuscripts, no review notes). */
const PUBLIC_COLUMNS =
  "id, slug, title, subtitle, author_name, description, language, genre, isbn, page_count, trim_size, binding, interior, paper, cover_finish, mrp, cover_path, published_at, author_id, sample_path, sample_from, sample_to, eeid, edition_label";
export type PublicBook = Pick<
  Book,
  | "id" | "slug" | "title" | "subtitle" | "author_name" | "description" | "language" | "genre" | "isbn"
  | "page_count" | "trim_size" | "binding" | "interior" | "paper" | "cover_finish" | "mrp" | "cover_path"
  | "published_at" | "author_id" | "sample_path" | "sample_from" | "sample_to" | "eeid" | "edition_label"
>;

export const PAGE_SIZE = 24;

/** Removes characters that have meaning in PostgREST filters, keeps Hindi letters. */
function cleanSearch(q: string) {
  return q.replace(/[,()*%\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listPublishedBooks({
  q = "",
  lang,
  genre,
  page = 1,
}: {
  q?: string;
  lang?: "hi" | "en";
  genre?: string;
  page?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("books")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const term = cleanSearch(q);
  if (term) query = query.or(`title.ilike.%${term}%,author_name.ilike.%${term}%,subtitle.ilike.%${term}%`);
  if (lang) query = query.eq("language", lang);
  if (genre) query = query.eq("genre", genre);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`Could not load books: ${error.message}`);
  return { books: (data ?? []) as PublicBook[], total: count ?? 0 };
}

export async function listGenres(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("genre").eq("status", "published").not("genre", "is", null);
  return [...new Set((data ?? []).map((r) => r.genre as string))].sort();
}

export async function getPublishedBook(slug: string): Promise<PublicBook | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return data as PublicBook | null;
}

export async function moreByAuthor(book: PublicBook, limit = 4): Promise<PublicBook[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .eq("author_id", book.author_id)
    .eq("author_name", book.author_name) // same account can use several pen names
    .neq("id", book.id)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicBook[];
}

/** Public URL of a cover in the "covers" storage bucket. */
export function coverUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
}

export const LANGUAGE_LABEL: Record<string, string> = { hi: "Hindi", en: "English" };

/** The author's public page handle, if they have one (for linking their name). */
export async function authorHandle(authorId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_authors").select("handle").eq("id", authorId).maybeSingle();
  return data?.handle ?? null;
}
