import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.full_name) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card">
          <h1 className="text-2xl font-semibold">Welcome! Tell us about you</h1>
          <p className="mt-1 text-muted">This takes 30 seconds.</p>
          <OnboardingForm profile={profile} />
        </div>
      </div>
    </main>
  );
}
