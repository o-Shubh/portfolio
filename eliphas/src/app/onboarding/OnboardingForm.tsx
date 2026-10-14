"use client";

import { useActionState } from "react";
import { completeOnboarding } from "@/app/actions/profile";
import { ProfileFields } from "@/components/ProfileFields";
import type { Profile } from "@/lib/auth";

export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <ProfileFields profile={profile} />
      {profile.role === "reader" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 ring-1 ring-transparent transition hover:ring-line p-4">
          <input type="checkbox" name="publish" className="mt-1 h-5 w-5 accent-[#C98200]" />
          <span>
            <span className="block font-semibold">I want to publish my book</span>
            <span className="text-sm text-muted">You can still buy books. You can also switch later.</span>
          </span>
        </label>
      )}
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-accent w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
