import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { accountNav } from "@/lib/nav";
import { getReferralSettings } from "@/lib/referrals";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const invites = (await getReferralSettings()).enabled && profile.role !== "printer";
  return (
    <AppShell profile={profile} areaLabel="My account" nav={accountNav(profile.role, invites)}>
      {children}
    </AppShell>
  );
}
