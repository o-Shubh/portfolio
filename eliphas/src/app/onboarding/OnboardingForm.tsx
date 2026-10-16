"use client";

import { useFormAction } from "@/lib/use-form-action";
import { completeOnboarding } from "@/app/actions/profile";
import { ProfileFields } from "@/components/ProfileFields";
import type { Profile } from "@/lib/auth";

export function OnboardingForm({ profile, next }: { profile: Profile; next: string }) {
  const [state, onSubmit, pending] = useFormAction(completeOnboarding);

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <ProfileFields profile={profile} />
      {next && <input type="hidden" name="next" value={next} />}
      {profile.role === "reader" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2 ring-1 ring-transparent transition hover:ring-line p-4">
          <input type="checkbox" name="publish" className="mt-1 h-5 w-5 accent-fg" />
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
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
