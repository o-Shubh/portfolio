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
    // New accounts set up their name first, then carry on to where they were going (e.g. liking an article).
    // On the author login, new accounts are set up as authors, and existing reader accounts are offered publishing.
    const { data: profile } = data.user ? await supabase.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle() : { data: null };
    router.replace(postLoginPath(profile, audience, next));
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
              <span className="field flex w-auto items-center gap-1.5 pr-2.5 tabular-nums" aria-hidden="true">
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
          className="field min-h-14 text-center font-mono text-2xl tracking-[0.5em]"
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

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p id="login-error" role="alert" className="text-sm font-medium text-danger">
      {children}
    </p>
  );
}

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("invalid")) return "That code is wrong or has expired. Try again.";
  if (m.includes("rate") || m.includes("security purposes")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("signups not allowed") || m.includes("provider")) return "Phone login isn't set up yet. Please contact support.";
  return message;
}
