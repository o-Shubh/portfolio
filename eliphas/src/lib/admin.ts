import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Signed links (valid 1 hour) to a book's private print files, for admins and printers. */
export async function printFileLinks(book: { manuscript_path: string | null; print_cover_path: string | null }) {
  const supabase = await createClient();
  const sign = async (path: string | null) =>
    path ? ((await supabase.storage.from("manuscripts").createSignedUrl(path, 3600)).data?.signedUrl ?? null) : null;
  const [manuscript, printCover] = await Promise.all([sign(book.manuscript_path), sign(book.print_cover_path)]);
  return { manuscript, printCover };
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
