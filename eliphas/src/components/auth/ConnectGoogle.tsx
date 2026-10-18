"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Adds Google as a second way to sign in to this same account (needs "manual linking" on in Supabase). */
export function ConnectGoogle() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn-ghost min-h-10 px-3 text-sm"
        disabled={busy}
        data-testid="connect-google"
        onClick={async () => {
          setBusy(true);
          setError(null);
          const { error } = await createClient().auth.linkIdentity({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/profile")}` },
          });
          if (error) {
            setBusy(false);
            setError(/manual linking/i.test(error.message) ? "Connecting Google isn't switched on yet. Ask the Eliphas team." : "Couldn't open Google. Try again.");
          }
        }}
      >
        {busy ? "Opening Google…" : "Connect Google"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
