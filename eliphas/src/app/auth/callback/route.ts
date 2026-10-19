import { parseEmail } from "@/lib/email-format";
import { NextResponse } from "next/server";
import { postLoginPath } from "@/lib/post-login";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Google (and other OAuth) sign-ins come back here with a one-time code. We swap it for a session, then send the
 * person on exactly as the phone login would. Also used when someone connects Google to an existing account.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const audience = url.searchParams.get("as") === "author" ? "author" : "reader";
  const next = safeNext(url.searchParams.get("next"), audience === "author" ? "/author" : "/dashboard");
  const loginPage = audience === "author" ? "/login/author" : "/login";
  const fail = (reason: string) => NextResponse.redirect(new URL(`${loginPage}?error=${reason}`, url.origin));

  // Google reports cancellations and problems as error parameters
  if (url.searchParams.get("error")) return fail(url.searchParams.get("error") === "access_denied" ? "google_cancelled" : "google");
  const code = url.searchParams.get("code");
  if (!code) return fail("google");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("google");
  const { data: profile } = await supabase.from("profiles").select("full_name, role, email").eq("id", data.user.id).maybeSingle();
  // Google gives a verified email: use it for order updates unless the person already set one
  const googleEmail = parseEmail(data.user.email);
  if (profile && !profile.email && googleEmail && googleEmail !== "invalid") {
    await supabase.from("profiles").update({ email: googleEmail }).eq("id", data.user.id);
  }
  return NextResponse.redirect(new URL(postLoginPath(profile, audience, next), url.origin));
}
