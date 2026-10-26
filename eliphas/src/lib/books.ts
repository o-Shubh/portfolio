import "server-only";
import { seesMature } from "@/lib/mature";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Book = Database["public"]["Tables"]["books"]["Row"];

/** Columns safe to show the public (no file paths of private manuscripts, no review notes). */
const PUBLIC_COLUMNS =
  "id, slug, title, subtitle, author_name, description, language, genre, isbn, page_count, trim_size, binding, interior, paper, cover_finish, mrp, cover_path, published_at, author_id, sample_path, sample_from, sample_to, eeid, edition_label, age_rating";
export type PublicBook = Pick<
  Book,
  | "id" | "slug" | "title" | "subtitle" | "author_name" | "description" | "language" | "genre" | "isbn"
  | "page_count" | "trim_size" | "binding" | "interior" | "paper" | "cover_finish" | "mrp" | "cover_path"
  | "published_at" | "author_id" | "sample_path" | "sample_from" | "sample_to" | "eeid" | "edition_label" | "age_rating"
>;

export const PAGE_SIZE = 24;

export type BookSort = "newest" | "price-asc" | "price-desc";
export const BOOK_SORTS: { value: BookSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** Removes characters that have meaning in PostgREST filters, keeps Hindi letters. */
function cleanSearch(q: string) {
  return q.replace(/[,()*%\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listPublishedBooks({
  q = "",
  lang,
  genre,
  binding,
  maxPrice,
  sort = "newest",
  page = 1,
}: {
  q?: string;
  lang?: "hi" | "en";
  genre?: string;
  binding?: "paperback" | "hardcover";
  maxPrice?: number;
  sort?: BookSort;
  page?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from("books").select(PUBLIC_COLUMNS, { count: "exact" }).eq("status", "published");
  // 18+ books only for visitors who confirmed their age
  if (!(await seesMature())) query = query.neq("age_rating", "mature");
  if (sort === "price-asc") query = query.order("mrp", { ascending: true, nullsFirst: false });
  else if (sort === "price-desc") query = query.order("mrp", { ascending: false, nullsFirst: false });
  query = query.order("published_at", { ascending: false }).order("id");

  const term = cleanSearch(q);
  if (term) query = query.or(`title.ilike.%${term}%,author_name.ilike.%${term}%,subtitle.ilike.%${term}%`);
  if (lang) query = query.eq("language", lang);
  if (genre) query = query.eq("genre", genre);
  if (binding) query = query.eq("binding", binding);
  if (maxPrice && maxPrice > 0) query = query.lte("mrp", maxPrice);

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
    .in("age_rating", (await seesMature()) ? ["general", "mature"] : ["general"])
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
export const BINDING_LABEL: Record<string, string> = { paperback: "Paperback", hardcover: "Hardcover" };

/** The author's public page handle, if they have one (for linking their name). */
export async function authorHandle(authorId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_authors").select("handle").eq("id", authorId).maybeSingle();
  return data?.handle ?? null;
}
