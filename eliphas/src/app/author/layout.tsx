import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { AUTHOR_NAV, INVITE_NAV } from "@/lib/nav";
import { getReferralSettings } from "@/lib/referrals";

export default async function AuthorLayout({ children }: LayoutProps<"/author">) {
  const me = await getCurrentProfile();
  if (!me) redirect("/login/author");
  if (!me.full_name) redirect("/onboarding?as=author&next=/author");
  // Readers who open the author area are offered publishing on the same account
  if (me.role === "reader") redirect("/login/author/start");
  const profile = await requireRole(["author", "admin"]);
  // Invites sit just above Settings & help while the referral programme is on
  const nav = (await getReferralSettings()).enabled ? [...AUTHOR_NAV.slice(0, -1), INVITE_NAV, AUTHOR_NAV[AUTHOR_NAV.length - 1]] : AUTHOR_NAV;
  return (
    <AppShell profile={profile} areaLabel="Author" nav={nav}>
      {children}
    </AppShell>
  );
}
