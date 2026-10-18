import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { AUTHOR_NAV } from "@/lib/nav";

export default async function AuthorLayout({ children }: LayoutProps<"/author">) {
  const me = await getCurrentProfile();
  if (!me) redirect("/login/author");
  if (!me.full_name) redirect("/onboarding?as=author&next=/author");
  // Readers who open the author area are offered publishing on the same account
  if (me.role === "reader") redirect("/login/author/start");
  const profile = await requireRole(["author", "admin"]);
  return (
    <AppShell profile={profile} areaLabel="Author" nav={AUTHOR_NAV}>
      {children}
    </AppShell>
  );
}
