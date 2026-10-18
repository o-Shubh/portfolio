import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileForm } from "@/components/ProfileForm";
import { avatarUrl } from "@/lib/avatars";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
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
  return (
    <>
      <PageHeader
        title="Settings & help"
        intro={`${formatPhone(profile.phone) || "Signed in with Google"} · ${ROLE_LABEL[profile.role]} account`}
      />
      <div className="max-w-xl space-y-8">
        <AvatarUpload name={profile.full_name} path={profile.avatar_path} url={avatarUrl(profile.avatar_path)} />
        <ProfileForm profile={profile} />
        <section className="card" aria-labelledby="signin-h" data-testid="signin-methods">
          <h2 id="signin-h" className="text-lg">Ways to sign in</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            <li className="flex items-center justify-between gap-3 py-2.5">
              <span>Mobile number</span>
              <span className="text-muted">{profile.phone ? formatPhone(profile.phone) : "Not added"}</span>
            </li>
            {(google || googleId) && (
              <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>Google</span>
                {googleId ? <span className="text-muted">Connected{googleEmail ? ` · ${googleEmail}` : ""}</span> : <ConnectGoogle />}
              </li>
            )}
          </ul>
          {google && !googleId && <p className="mt-1 text-xs text-muted">Connect Google to sign in to this same account with either method.</p>}
        </section>
        <section className="card divide-y divide-line py-1" aria-label="Settings">
          <div className="flex items-center justify-between gap-4 py-2">
            <span>
              <span className="block font-medium">Appearance</span>
              <span className="text-sm text-muted">Device setting, light or dark. Saved on this device.</span>
            </span>
            <ThemeToggle />
          </div>
          <form action={signOut} className="py-2">
            <button type="submit" className="btn-quiet -mx-3 w-[calc(100%+1.5rem)] justify-start">
              <LogOut className="h-4 w-4" aria-hidden /> Log out
            </button>
          </form>
        </section>
        <section className="card py-1" aria-labelledby="help-h">
          <h2 id="help-h" className="pt-3 text-lg">Help</h2>
          <ul className="divide-y divide-line">
            {[
              { href: "/faq", label: "Help and FAQ" },
              { href: "/contact", label: "Contact support" },
              { href: "/refunds", label: "Refunds and cancellations" },
              { href: "/terms", label: "Terms of use" },
              { href: "/privacy", label: "Privacy policy" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-12 items-center justify-between">
                  {l.label} <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <DeleteAccount />
      </div>
    </>
  );
}
