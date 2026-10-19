"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendly } from "@/app/login/LoginForm";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ error?: string; ok?: string }>({});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setState({ error: "Choose a password of at least 8 characters." });
    if (password !== again) return setState({ error: "The two passwords don't match." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setState({ error: friendly(error.message, "email") });
    setPassword("");
    setAgain("");
    setState({ ok: "Password saved. Use it next time you log in." });
  }

  return (
    <form onSubmit={save} className="card max-w-lg space-y-4" noValidate>
      <div>
        <label htmlFor="new-password" className="label">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="hint">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="new-password-again" className="label">
          New password again
        </label>
        <input
          id="new-password-again"
          type="password"
          autoComplete="new-password"
          maxLength={72}
          className="field"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
      </div>
      {state.error && (
        <p role="alert" className="notice-danger py-2.5 font-medium">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="notice-success py-2.5 font-medium">
          {state.ok}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
