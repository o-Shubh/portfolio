import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  return (
    <>
      <PageHeader
        title="Profile"
        intro={`${formatPhone(profile.phone)} · ${ROLE_LABEL[profile.role]} account`}
      />
      <div className="max-w-xl">
        <ProfileForm profile={profile} />
      </div>
    </>
  );
}
