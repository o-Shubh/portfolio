import { NextResponse } from "next/server";
import { CAMPAIGN_COOKIE, CAMPAIGN_DAYS } from "@/lib/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Campaign link: counts the click (no reader details stored), remembers the link in a first-party
 * cookie for attribution, and sends the reader to the book page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const site = new URL(request.url).origin;
  if (!/^[a-z0-9]{6,12}$/.test(code)) return NextResponse.redirect(`${site}/books`);
  const admin = createAdminClient();
  const { data: link } = await admin.from("campaign_links").select("id, archived, books(slug, status)").eq("code", code).maybeSingle();
  if (!link || link.archived || !link.books || link.books.status !== "published") return NextResponse.redirect(`${site}/books`);

  await admin.from("campaign_clicks").insert({ link_id: link.id });
  const res = NextResponse.redirect(`${site}/books/${link.books.slug}`);
  res.cookies.set(CAMPAIGN_COOKIE, code, { maxAge: CAMPAIGN_DAYS * 86400, httpOnly: true, sameSite: "lax", secure: site.startsWith("https"), path: "/" });
  return res;
}
