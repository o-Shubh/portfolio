"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { afterSignIn, ErrorText, friendly } from "./LoginForm";

type Audience = "reader" | "author";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where Supabase's email links (confirm, sign-in, reset) come back to. */
function callbackUrl(next: string, audience: Audience) {
  const back = new URL("/auth/callback", window.location.origin);
  back.searchParams.set("next", next);
  if (audience === "author") back.searchParams.set("as", "author");
  back.searchParams.set("via", "email");
  return back.toString();
}

/**
 * Email sign-in: email + password (sign up or log in, following the page's mode). When Supabase can send email
 * (`codes`), there is also "email me a code" and "forgot password". A sign-up that needs confirming continues with
 * the code from the confirmation email (or its link).
 */
export function EmailForm({ next, audience, mode, codes }: { next: string; audience: Audience; mode: "login" | "signup"; codes: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code-request" | "code" | "reset" | "reset-sent">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentFor, setSentFor] = useState<"signup" | "code">("code");

  const cleanEmail = () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean) || clean.length > 254) {
      setError("Enter a valid email address.");
      return null;
    }
    return clean;
  };
  const done = async (supabase: ReturnType<typeof createClient>, userId: string | undefined, address: string) => {
    router.replace(await afterSignIn(supabase, userId, address, audience, next));
    router.refresh();
  };

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const address = cleanEmail();
    if (!address) return;
    if (password.length < 8) {
      setError(mode === "signup" ? "Choose a password of at least 8 characters." : "Enter your password.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: callbackUrl(next, audience) } });
      if (error) {
        setBusy(false);
        setError(friendly(error.message, "email"));
        return;
      }
      if (data.session) return done(supabase, data.user?.id, address);
      // Email confirmation is on: Supabase sent a code and link. (It also lands here for an address that already has an account.)
      setBusy(false);
      setEmail(address);
      setSentFor("signup");
      setStep("code");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: address, password });
    if (error) {
      setBusy(false);
      setError(friendly(error.message, "email"));
      return;
    }
    return done(supabase, data.user?.id, address);
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const address = cleanEmail();
    if (!address) return;
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true, emailRedirectTo: callbackUrl(next, audience) },
    });
    setBusy(false);
    if (error) {
      setError(friendly(error.message, "email"));
      return;
    }
    setEmail(address);
    setSentFor("code");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6,8}$/.test(code)) {
      setError("Enter the code from the email.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setBusy(false);
      setError(friendly(error.message, "email"));
      return;
    }
    return done(supabase, data.user?.id, email);
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const address = cleanEmail();
    if (!address) return;
    setBusy(true);
    const { error } = await createClient().auth.resetPasswordForEmail(address, { redirectTo: callbackUrl("/account/password", audience) });
    setBusy(false);
    if (error) {
      setError(friendly(error.message, "email"));
      return;
    }
    setEmail(address);
    setStep("reset-sent");
  }

  const emailField = (
    <div>
      <label htmlFor="login-email" className="label">
        Email address
      </label>
      <input
        id="login-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete={mode === "signup" ? "email" : "username"}
        placeholder="you@example.com"
        maxLength={254}
        className="field"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(null);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "login-error" : undefined}
      />
    </div>
  );
  const link = (label: string, to: typeof step) => (
    <button
      type="button"
      className="font-medium text-fg underline underline-offset-2"
      onClick={() => {
        setStep(to);
        setError(null);
        setCode("");
      }}
    >
      {label}
    </button>
  );

  if (step === "password") {
    return (
      <form onSubmit={withPassword} className="mt-6 space-y-4" noValidate>
        {emailField}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="label">
              {mode === "signup" ? "Create a password" : "Password"}
            </label>
            {codes && mode === "login" && <span className="text-sm">{link("Forgot password?", "reset")}</span>}
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={8}
            maxLength={72}
            className="field"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : mode === "signup" ? "password-hint" : undefined}
          />
          {mode === "signup" && (
            <p id="password-hint" className="hint">
              At least 8 characters.
            </p>
          )}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? (mode === "signup" ? "Creating…" : "Signing in…") : mode === "signup" ? "Create account" : "Log in"}
        </button>
        {codes && <p className="text-center text-sm text-muted">{link("Email me a sign-in code instead", "code-request")}</p>}
      </form>
    );
  }

  if (step === "code-request" || step === "reset") {
    const reset = step === "reset";
    return (
      <form onSubmit={reset ? sendReset : requestCode} className="mt-6 space-y-4" noValidate>
        <p className="text-sm text-muted">
          {reset ? "We'll email you a link to choose a new password." : "We'll email you a code to sign in, no password needed."}
        </p>
        {emailField}
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Sending…" : reset ? "Send reset link" : "Send code"}
        </button>
        <p className="text-center text-sm text-muted">{link("Use a password instead", "password")}</p>
      </form>
    );
  }

  if (step === "reset-sent") {
    return (
      <div className="mt-6 space-y-3" role="status">
        <p className="notice-success">
          If {email} has an account, a link to choose a new password is on its way. Open it on this device. Check your spam folder if it isn&apos;t there in a
          minute.
        </p>
        <p className="text-center text-sm text-muted">{link("Back to log in", "password")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={verifyCode} className="mt-6 space-y-4" noValidate>
      <p className="text-sm text-muted">
        {sentFor === "signup" ? "To finish, confirm your email: we sent a code" : "Code sent"} to <span className="font-medium text-fg">{email}</span>. Check
        your spam folder if it isn&apos;t there in a minute. {link("Change", sentFor === "signup" ? "password" : "code-request")}
      </p>
      <div>
        <label htmlFor="email-code" className="label">
          Code from the email
        </label>
        <input
          id="email-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          className="field min-h-14 text-center mono text-2xl tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          autoFocus
        />
        <p className="hint">Or tap the link in the same email, on this device.</p>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Checking…" : "Verify and continue"}
      </button>
    </form>
  );
}
