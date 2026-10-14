"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import type { Profile } from "@/lib/auth";
import { ProfileFields } from "./ProfileFields";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="card space-y-4">
      <ProfileFields profile={profile} />
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
