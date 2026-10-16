"use client";

import { useFormAction } from "@/lib/use-form-action";
import { updateProfile } from "@/app/actions/profile";
import type { Profile } from "@/lib/auth";
import { ProfileFields } from "./ProfileFields";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, onSubmit, pending] = useFormAction(updateProfile);
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <ProfileFields profile={profile} />
      {(profile.role === "author" || profile.role === "admin") && (
        <div>
          <label htmlFor="bio" className="label">
            Author bio
          </label>
          <textarea id="bio" name="bio" rows={4} maxLength={600} defaultValue={profile.bio ?? ""} className="field" aria-describedby="bio-help" />
          <p id="bio-help" className="mt-1 text-xs text-muted">
            Shown on your public author page and under your articles. Up to 600 characters. Don&apos;t include phone numbers or addresses.
          </p>
        </div>
      )}
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm font-medium text-success">
          Saved.
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
