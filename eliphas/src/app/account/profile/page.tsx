import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ProfileForm } from "@/components/ProfileForm";
import { avatarUrl } from "@/lib/avatars";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
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
        <DeleteAccount />
      </div>
    </>
  );
}
