import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileForm } from "@/components/ProfileForm";
import { avatarUrl } from "@/lib/avatars";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeleteAccount } from "./DeleteAccount";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  return (
    <>
      <PageHeader
        title="Profile"
        intro={`${formatPhone(profile.phone)} · ${ROLE_LABEL[profile.role]} account`}
      />
      <div className="max-w-xl space-y-8">
        <AvatarUpload name={profile.full_name} path={profile.avatar_path} url={avatarUrl(profile.avatar_path)} />
        <ProfileForm profile={profile} />
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
        <DeleteAccount />
      </div>
    </>
  );
}
