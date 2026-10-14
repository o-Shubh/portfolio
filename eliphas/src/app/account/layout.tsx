import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { accountNav } from "@/lib/nav";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  return (
    <AppShell profile={profile} areaLabel="My account" nav={accountNav(profile.role)}>
      {children}
    </AppShell>
  );
}
