"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cleanIndianMobile, formatPhone, toE164 } from "@/lib/phone";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mobile = cleanIndianMobile(phone);
    if (!mobile) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({ phone: toE164(mobile) });
    setBusy(false);
    if (error) {
      setError(friendly(error.message));
      return;
    }
    setPhone(mobile);
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
    const { error } = await createClient().auth.verifyOtp({ phone: toE164(phone), token: code, type: "sms" });
    if (error) {
      setBusy(false);
      setError(friendly(error.message));
      return;
    }
    router.replace(next);
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
            <span className="field flex w-auto shrink-0 items-center font-semibold" aria-hidden="true">
              🇮🇳 +91
            </span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              maxLength={14}
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
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="mt-6 space-y-4" noValidate>
      <p className="text-sm text-muted">
        Code sent to <span className="font-semibold text-fg">{formatPhone(phone)}</span>.{" "}
        <button
          type="button"
          className="font-semibold text-fg underline"
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
          className="field min-h-14 text-center text-2xl font-semibold tracking-[0.6em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          autoFocus
        />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" className="btn-accent w-full" disabled={busy}>
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
