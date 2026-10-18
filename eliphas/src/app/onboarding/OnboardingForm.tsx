"use client";

import { useFormAction } from "@/lib/use-form-action";
import { completeOnboarding } from "@/app/actions/profile";
import { ProfileFields } from "@/components/ProfileFields";
import type { Profile } from "@/lib/auth";

export function OnboardingForm({ profile, next, asAuthor = false }: { profile: Profile; next: string; asAuthor?: boolean }) {
  const [state, onSubmit, pending] = useFormAction(completeOnboarding);

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <ProfileFields profile={profile} />
      {next && <input type="hidden" name="next" value={next} />}
      {profile.role === "reader" && (
        <fieldset className="space-y-2">
          <legend className="label">I&apos;m joining as</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] bg-surface p-4 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-accent">
            <input type="radio" name="publish" value="off" defaultChecked={!asAuthor} className="mt-1 h-5 w-5 accent-[var(--primary)]" />
            <span>
              <span className="block font-semibold">A reader</span>
              <span className="text-sm text-muted">Buy books, read articles, follow authors and join the Community.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] bg-surface p-4 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-accent">
            <input type="radio" name="publish" value="on" defaultChecked={asAuthor} className="mt-1 h-5 w-5 accent-[var(--primary)]" />
            <span>
              <span className="block font-semibold">An author</span>
              <span className="text-sm text-muted">Publish your books, and apply for the Verified Author badge. You keep everything readers can do.</span>
            </span>
          </label>
        </fieldset>
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
