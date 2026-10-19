"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postLoginPath } from "@/lib/post-login";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";
import { COUNTRIES, countryByIso, DEFAULT_COUNTRY, formatPhone, toInternational } from "@/lib/phone";

/** Phone + code sign-in. `audience` is which entrance was used (reader or author login); both use the same account. */
export function LoginForm({ next, audience = "reader", submitLabel = "Send code" }: { next: string; audience?: "reader" | "author"; submitLabel?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const full = toInternational(country, phone);
    if (!full) {
      setError(country === "IN" ? "Enter a valid 10-digit mobile number." : "Enter a valid mobile number for the selected country.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({ phone: full });
    setBusy(false);
    if (error) {
      setError(friendly(error.message));
      return;
    }
    setE164(full);
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: code, type: "sms" });
    if (error) {
      setBusy(false);
      setError(friendly(error.message));
      return;
    }
    router.replace(await afterSignIn(supabase, data.user?.id, null, audience, next));
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="phone" className="label">
            Mobile number
          </label>
          <div className="flex gap-2">
            {/* The real select sits invisibly on top of a compact "IN +91" label */}
            <div className="relative shrink-0">
              <span className="field flex w-auto items-center gap-1.5 pr-2.5 mono" aria-hidden="true">
                <span className="text-xs font-medium text-muted">{country}</span>+{countryByIso(country).dial}
                <ChevronDown className="h-4 w-4 text-muted" />
              </span>
              <label htmlFor="country" className="sr-only">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.name} (+{c.dial})
                  </option>
                ))}
              </select>
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={country === "IN" ? "98765 43210" : "Mobile number"}
              maxLength={20}
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              autoFocus
            />
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Sending…" : submitLabel}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="mt-6 space-y-4" noValidate>
      <p className="text-sm text-muted">
        Code sent to <span className="font-medium text-fg">{formatPhone(e164)}</span>.{" "}
        <button
          type="button"
          className="font-medium text-fg underline underline-offset-2"
          onClick={() => {
            setStep("phone");
            setCode("");
            setError(null);
          }}
        >
          Change
        </button>
      </p>
      <div>
        <label htmlFor="code" className="label">
          6-digit code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          className="field min-h-14 text-center mono text-2xl tracking-[0.5em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          autoFocus
        />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Checking…" : "Verify and continue"}
      </button>
    </form>
  );
}

/**
 * Where to go once signed in. New accounts set up their name first, then carry on to where they were going (e.g. liking
 * an article). On the author login, new accounts are set up as authors, and existing reader accounts are offered
 * publishing. An email sign-in also becomes the address for order updates if none is set.
 */
export async function afterSignIn(supabase: ReturnType<typeof createClient>, userId: string | undefined, email: string | null, audience: "reader" | "author", next: string) {
  const { data: profile } = userId ? await supabase.from("profiles").select("full_name, role, email").eq("id", userId).maybeSingle() : { data: null };
  if (userId && email && profile && !profile.email) await supabase.from("profiles").update({ email }).eq("id", userId);
  return postLoginPath(profile, audience, next);
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p id="login-error" role="alert" className="text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function friendly(message: string, method: "phone" | "email" = "phone") {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them, or create an account.";
  if (m.includes("already registered") || m.includes("already been registered")) return "This email already has an account. Log in instead.";
  if (m.includes("password should") || m.includes("weak password")) return "Choose a longer password: at least 8 characters, not easy to guess.";
  if (m.includes("email not confirmed")) return "Please confirm your email first: use the code or link we sent you.";
  if (m.includes("sending") && m.includes("email")) return "We couldn't send the email right now. Please try again later or use another way to sign in.";
  if (m.includes("expired") || m.includes("invalid")) return "That code is wrong or has expired. Try again.";
  if (m.includes("rate") || m.includes("security purposes")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("signups not allowed") || m.includes("provider") || m.includes("not authorized"))
    return method === "email" ? "Email sign-in isn't available right now. Please try another way or contact us." : "Phone login isn't set up yet. Please contact support.";
  return message;
}
