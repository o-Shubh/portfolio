"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Google's "G" mark, as its brand guidelines ask for on sign-in buttons. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * Sign in or sign up with Google. Google sends the person back to /auth/callback, which finishes the login and
 * routes them like the phone login does (new accounts set up their name; the author entrance sets up authors).
 */
export function GoogleButton({ next, audience, label = "Continue with Google" }: { next: string; audience: "reader" | "author"; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn-ghost w-full gap-3 bg-surface"
        disabled={busy}
        data-testid="google-signin"
        onClick={async () => {
          setBusy(true);
          setError(null);
          const back = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&as=${audience}`;
          const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: back } });
          if (error) {
            setBusy(false);
            setError("Google sign-in isn't available right now. Use your mobile number instead.");
          }
        }}
      >
        <GoogleMark /> {busy ? "Opening Google…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
