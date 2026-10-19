import { createAdminClient } from "@/lib/supabase/admin";

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

/**
 * Counts a book page view or a sample opening for the author's reach numbers. Only a daily count per book is kept:
 * nothing about the visitor. The browser sends each event at most once a day per book.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kind = new URL(request.url).searchParams.get("k");
  if ((kind !== "view" && kind !== "sample") || BOTS.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const admin = createAdminClient();
  const { data: book } = await admin.from("books").select("id").eq("slug", slug).eq("status", "published").maybeSingle();
  if (book) await admin.rpc("count_book_event", { p_book: book.id, p_kind: kind });
  return new Response(null, { status: 204 });
}
