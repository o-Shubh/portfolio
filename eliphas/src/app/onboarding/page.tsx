import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { next, as } = await searchParams;
  const asAuthor = as === "author"; // came from the author login
  // Only allow returning to a page on this site (e.g. the article someone was liking)
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const profile = await getCurrentProfile();
  if (!profile) redirect(asAuthor ? "/login/author" : "/login");
  if (profile.full_name) redirect(safeNext || "/dashboard");
  // Google sign-ups: start with the name Google gave us (they can change it)
  const meta = (await (await createClient()).auth.getUser()).data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const suggested = (meta?.full_name || meta?.name || "").trim().slice(0, 80);

  return (
    <AuthFrame audience={asAuthor ? "author" : "reader"}>
      <span className="eyebrow">Almost there</span>
      <h1 className="display mt-3 text-[1.875rem] leading-tight">{asAuthor ? "Set up your author account" : "Tell us about you"}</h1>
      <p className="mt-2 text-muted">This takes 30 seconds.</p>
      <OnboardingForm profile={suggested ? { ...profile, full_name: suggested } : profile} next={safeNext} asAuthor={asAuthor} />
    </AuthFrame>
  );
}
