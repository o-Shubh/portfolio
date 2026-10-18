import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";
import { googleSignInEnabled } from "@/lib/google-auth";
import { GoogleButton } from "./GoogleButton";
import { LoginSwitch } from "./LoginSwitch";

const COPY = {
  reader: {
    login: { title: "Reader login", intro: "Welcome back. Log in to see your orders, saved items and community." },
    signup: { title: "Create your reader account", intro: "Free. Buy books, read samples, save articles and join the community." },
  },
  author: {
    login: { title: "Author login", intro: "Welcome back. Log in to manage your books, sales and payouts." },
    signup: { title: "Create your author account", intro: "Free to publish. Upload your book, set your price and earn on every copy." },
  },
} as const;

const ERRORS: Record<string, string> = {
  google: "Google sign-in didn't finish. Try again, or use your mobile number.",
  google_cancelled: "Google sign-in was cancelled. You can try again, or use your mobile number.",
};

/**
 * The reader and author entrances: log in or sign up with a mobile number (code by SMS) or with Google.
 * Logging in and signing up are the same action; "mode" only changes the wording.
 */
export async function AuthEntrance({ audience, mode, next, error }: { audience: "reader" | "author"; mode: "login" | "signup"; next: string; error?: string }) {
  const copy = COPY[audience][mode];
  const google = await googleSignInEnabled();
  const base = audience === "author" ? "/login/author" : "/login";
  const keepNext = (n: string) => (n === (audience === "author" ? "/author" : "/dashboard") ? "" : `next=${encodeURIComponent(n)}`);
  const href = (m: "login" | "signup") => {
    const q = [m === "signup" ? "mode=signup" : "", keepNext(next)].filter(Boolean).join("&");
    return q ? `${base}?${q}` : base;
  };

  return (
    <>
      <LoginSwitch current={audience} next={keepNext(next) ? next : undefined} mode={mode} />
      <h1 className="display text-[1.875rem] leading-tight" data-testid="auth-title">
        {copy.title}
      </h1>
      <p className="mt-3 text-muted">{copy.intro}</p>
      {error && ERRORS[error] && (
        <p role="alert" className="notice-danger mt-4" data-testid="auth-error">
          {ERRORS[error]}
        </p>
      )}
      {google && (
        <div className="mt-6 space-y-4">
          <GoogleButton next={next} audience={audience} label={mode === "signup" ? "Sign up with Google" : "Continue with Google"} />
          <p className="flex items-center gap-3 text-xs text-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" /> or use your mobile number <span className="h-px flex-1 bg-line" />
          </p>
        </div>
      )}
      <LoginForm next={next} audience={audience} submitLabel={mode === "signup" ? "Sign up: send code" : "Send code"} />
      <p className="mt-6 rounded-[var(--radius-control)] bg-surface-2 p-3 text-center text-sm" data-testid="auth-mode-switch">
        {mode === "login" ? (
          <>
            New to Eliphas?{" "}
            <Link href={href("signup")} className="font-semibold text-accent-fg hover:underline">
              {audience === "author" ? "Create an author account" : "Create a free account"}
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={href("login")} className="font-semibold text-accent-fg hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        {mode === "signup"
          ? "Enter your number and we'll text you a code. Your account is created when you confirm it."
          : "No account yet? Enter your number anyway and we'll create one."}
        {google && " Google and mobile-number sign-ins are separate accounts unless you connect Google in Settings."}
      </p>
      <p className="mt-4 text-center text-sm text-muted">
        {audience === "reader" ? (
          <>
            Want to publish a book?{" "}
            <Link href="/login/author?mode=signup" className="font-semibold text-accent-fg hover:underline" data-testid="to-author-login">
              Author sign up
            </Link>
          </>
        ) : (
          <>
            Here to buy or read?{" "}
            <Link href="/login" className="font-semibold text-accent-fg hover:underline" data-testid="to-reader-login">
              Reader login
            </Link>
          </>
        )}
      </p>
      <p className="mt-8 text-center text-xs text-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-fg">
          terms of use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
          privacy policy
        </Link>
        .
      </p>
    </>
  );
}
