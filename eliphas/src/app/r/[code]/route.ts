import { NextResponse } from "next/server";
import { inviterForCode, REFERRAL_COOKIE, REFERRAL_DAYS } from "@/lib/referrals";

/**
 * Invite link: /r/CODE, or /r/CODE?b=book-slug to share a book. Remembers the code in a first-party cookie
 * (used when a new account is set up) and sends the visitor on. Nothing about the visitor is stored.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const url = new URL(request.url);
  const code = raw.toUpperCase();
  const book = url.searchParams.get("b") ?? "";
  const target = /^[a-z0-9-]{1,120}$/.test(book) ? `/books/${book}` : `/join`;
  const inviter = await inviterForCode(code);
  if (!inviter) return NextResponse.redirect(new URL(target === "/join" ? "/" : target, url.origin));
  const res = NextResponse.redirect(new URL(target, url.origin));
  res.cookies.set(REFERRAL_COOKIE, code, { maxAge: REFERRAL_DAYS * 86400, httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/" });
  return res;
}
