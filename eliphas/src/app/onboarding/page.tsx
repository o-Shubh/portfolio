import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.full_name) redirect("/dashboard");

  return (
    <AuthFrame>
      <span className="eyebrow">Almost there</span>
      <h1 className="mt-3 text-4xl">Tell us about you</h1>
      <p className="mt-2 text-muted">This takes 30 seconds.</p>
      <OnboardingForm profile={profile} />
    </AuthFrame>
  );
}
