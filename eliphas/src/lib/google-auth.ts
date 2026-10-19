import "server-only";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

export type SignInMethods = { google: boolean; phone: boolean; email: boolean; emailCodes: boolean };

/**
 * Which ways to sign in are switched on in Supabase (Authentication → Sign In / Providers), checked every 5 minutes.
 * A method only appears once it works, so there's never a button or form that leads nowhere:
 *  - phone: needs an SMS provider (with DLT registration in India);
 *  - google: needs the Google provider;
 *  - email + password: the Email provider (on by default). With "Confirm email" off it needs no email sending at all;
 *  - emailCodes (sign-in codes, confirming sign-ups, "forgot password"): Supabase must be able to send email, which needs
 *    your own SMTP (e.g. Resend), then AUTH_EMAILS_ENABLED=true. Supabase's built-in email only reaches your own team.
 */
export async function signInMethods(): Promise<SignInMethods> {
  try {
    const res = await fetch(`${supabaseUrl()}/auth/v1/settings`, { headers: { apikey: supabasePublishableKey() }, next: { revalidate: 300 } });
    if (!res.ok) return { google: false, phone: true, email: false, emailCodes: false };
    const s = (await res.json()) as { external?: Record<string, boolean> };
    return {
      google: Boolean(s.external?.google),
      phone: Boolean(s.external?.phone),
      email: Boolean(s.external?.email),
      emailCodes: Boolean(s.external?.email) && process.env.AUTH_EMAILS_ENABLED === "true",
    };
  } catch {
    return { google: false, phone: true, email: false, emailCodes: false };
  }
}

/** Whether "Continue with Google" is switched on. */
export const googleSignInEnabled = async () => (await signInMethods()).google;
