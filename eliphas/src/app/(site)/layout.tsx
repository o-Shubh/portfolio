import { InstallPrompt } from "@/components/InstallPrompt";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteTabBar } from "@/components/SiteTabBar";
import { getCurrentProfile } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SiteTabBar accountHref={profile ? "/dashboard" : "/login"} />
      <InstallPrompt aboveTabBar />
    </>
  );
}
