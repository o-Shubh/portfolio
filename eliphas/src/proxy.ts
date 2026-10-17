import type { NextRequest } from "next/server";
import { setupPage, setupProblems } from "@/lib/setup-check";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // A missing or mistyped setting shows a page that names it, instead of a bare server error
  const problems = setupProblems();
  if (problems.length) return setupPage(problems);
  try {
    return await updateSession(request);
  } catch (e) {
    console.error("Proxy failed", e);
    return setupPage([], "The website couldn't reach Supabase. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are copied exactly from Supabase → Connect, then Redeploy.");
  }
}

export const config = {
  // Skip static files, images and PWA files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|html|mjs)$).*)",
  ],
};
