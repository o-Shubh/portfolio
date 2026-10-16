import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { VIEWER_COOKIE, viewerKey } from "@/lib/articles";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Counts a view, sent by the article page after it loads (so bots that don't run scripts aren't counted).
 * One view per signed-in reader, or per browser, per article per day; the author's own visits don't count.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 204 });
  const admin = createAdminClient();
  const { data: a } = await admin.from("articles").select("author_id, status, moderation").eq("id", id).maybeSingle();
  if (!a || a.status !== "published" || a.moderation !== "visible") return new NextResponse(null, { status: 204 });
  const profile = await getCurrentProfile();
  if (profile?.id === a.author_id) return new NextResponse(null, { status: 204 });
  const { key, newCookie } = await viewerKey(profile?.id ?? null);
  await admin.from("article_views").upsert({ article_id: id, viewer_key: key }, { onConflict: "article_id,viewer_key,day", ignoreDuplicates: true });
  const res = new NextResponse(null, { status: 204 });
  if (newCookie) res.cookies.set(VIEWER_COOKIE, newCookie, { maxAge: 365 * 86400, httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/" });
  return res;
}
