import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileForm } from "@/components/ProfileForm";
import { avatarUrl } from "@/lib/avatars";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { seesMature } from "@/lib/mature";
import { MatureToggle } from "@/components/MatureToggle";
import { ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectGoogle } from "@/components/auth/ConnectGoogle";
import { googleSignInEnabled } from "@/lib/google-auth";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount } from "./DeleteAccount";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const [{ data: auth }, google] = await Promise.all([(await createClient()).auth.getUser(), googleSignInEnabled()]);
  const googleId = auth.user?.identities?.find((i) => i.provider === "google");
  const googleEmail = (googleId?.identity_data as { email?: string } | undefined)?.email;
  const signInEmail = auth.user?.identities?.some((i) => i.provider === "email") ? auth.user.email : null;
  return (
    <>
      <PageHeader title="Settings & help" intro={`${formatPhone(profile.phone) || signInEmail || "Signed in with Google"} · ${ROLE_LABEL[profile.role]} account`} />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-8">
          <AvatarUpload name={profile.full_name} path={profile.avatar_path} url={avatarUrl(profile.avatar_path)} />
          <ProfileForm profile={profile} />
        </div>

        <div className="min-w-0 space-y-8">
          <section aria-labelledby="signin-h" data-testid="signin-methods">
            <h2 id="signin-h" className="mb-2 px-1 text-sm font-medium text-muted">
              Ways to sign in
            </h2>
            <ul className="group-list text-[0.9375rem]">
              <li className="group-row justify-between">
                <span>Mobile number</span>
                <span className="text-muted">{profile.phone ? formatPhone(profile.phone) : "Not added"}</span>
              </li>
              {signInEmail && (
                <li className="group-row justify-between gap-3">
                  <span>Email</span>
                  <span className="truncate text-muted">{signInEmail}</span>
                </li>
              )}
              {signInEmail && (
                <li className="group-row justify-between">
                  <span>Password</span>
                  <Link href="/account/password" className="font-medium text-accent-fg hover:underline">
                    Change
                  </Link>
                </li>
              )}
              {(google || googleId) && (
                <li className="group-row flex-wrap justify-between">
                  <span>Google</span>
                  {googleId ? <span className="text-muted">Connected{googleEmail ? ` · ${googleEmail}` : ""}</span> : <ConnectGoogle />}
                </li>
              )}
            </ul>
            {google && !googleId && <p className="mt-2 px-1 text-xs text-muted">Connect Google to sign in to this same account with either method.</p>}
          </section>

          <section aria-labelledby="general-h">
            <h2 id="general-h" className="mb-2 px-1 text-sm font-medium text-muted">
              General
            </h2>
            <div className="group-list">
              <div className="group-row justify-between gap-4">
                <span>
                  <span className="block">Appearance</span>
                  <span className="text-sm text-muted">Device setting, light or dark. Saved on this device.</span>
                </span>
                <ThemeToggle />
              </div>
              <MatureToggle on={await seesMature()} />
              <form action={signOut}>
                <button type="submit" className="group-row w-full text-left hover:bg-surface-2">
                  <LogOut className="h-4 w-4 text-muted" aria-hidden /> Log out
                </button>
              </form>
            </div>
          </section>

          <section aria-labelledby="help-h">
            <h2 id="help-h" className="mb-2 px-1 text-sm font-medium text-muted">
              Help
            </h2>
            <ul className="group-list">
              {[
                { href: "/faq", label: "Help and FAQ" },
                { href: "/contact", label: "Contact support" },
                { href: "/refunds", label: "Refunds and cancellations" },
                { href: "/terms", label: "Terms of use" },
                { href: "/privacy", label: "Privacy policy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group-row justify-between hover:bg-surface-2">
                    {l.label} <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <DeleteAccount />
        </div>
      </div>
    </>
  );
}
