import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { next } = await searchParams;
  // Only allow returning to a page on this site (e.g. the article someone was liking)
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.full_name) redirect(safeNext || "/dashboard");

  return (
    <AuthFrame>
      <span className="eyebrow">Almost there</span>
      <h1 className="mt-3 text-4xl">Tell us about you</h1>
      <p className="mt-2 text-muted">This takes 30 seconds.</p>
      <OnboardingForm profile={profile} next={safeNext} />
    </AuthFrame>
  );
}
