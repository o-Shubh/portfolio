import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { VIEWER_COOKIE, viewerKey } from "@/lib/articles";
import { createAdminClient } from "@/lib/supabase/admin";

/** "View book" on an article's related-book card: counts the click (once per reader per day) and opens the book. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = new URL(request.url).origin;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(`${site}/books`);
  const admin = createAdminClient();
  const { data: a } = await admin.from("articles").select("author_id, status, moderation, books(id, slug, status)").eq("id", id).maybeSingle();
  if (!a?.books || a.books.status !== "published") return NextResponse.redirect(`${site}/books`);
  const res = NextResponse.redirect(`${site}/books/${a.books.slug}`);
  const profile = await getCurrentProfile();
  if (a.status === "published" && a.moderation === "visible" && profile?.id !== a.author_id) {
    const { key, newCookie } = await viewerKey(profile?.id ?? null);
    await admin.from("article_book_clicks").upsert({ article_id: id, viewer_key: key, book_id: a.books.id }, { onConflict: "article_id,viewer_key,day", ignoreDuplicates: true });
    if (newCookie) res.cookies.set(VIEWER_COOKIE, newCookie, { maxAge: 365 * 86400, httpOnly: true, sameSite: "lax", secure: site.startsWith("https"), path: "/" });
  }
  return res;
}
