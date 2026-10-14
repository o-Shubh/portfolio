import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { AUTHOR_NAV } from "@/lib/nav";

export default async function AuthorLayout({ children }: LayoutProps<"/author">) {
  const profile = await requireRole(["author", "admin"]);
  return (
    <AppShell profile={profile} areaLabel="Author" nav={AUTHOR_NAV}>
      {children}
    </AppShell>
  );
}
