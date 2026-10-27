import { PenLine } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { STUDIO_NAV } from "@/lib/nav";
import { canUseStudio } from "@/lib/studio/settings";

export const metadata = { title: { default: "Writing Studio", template: "%s — Writing Studio" } };

/** The Writing Studio area: for any signed-in person once it's open; admins only while it's being built. */
export default async function StudioLayout({ children }: LayoutProps<"/studio">) {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const allowed = await canUseStudio(profile);
  return (
    <AppShell profile={profile} areaLabel="Writing Studio" nav={STUDIO_NAV}>
      {allowed ? (
        children
      ) : (
        <div className="mx-auto max-w-xl py-10 text-center" data-testid="studio-closed">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tint-info text-accent-fg">
            <PenLine className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="display mt-4 text-2xl">The Writing Studio is coming soon</h1>
          <p className="mt-2 text-muted">
            Plan, write and polish your book with a team of AI assistants, approving every chapter yourself. We&apos;ll let you know when it opens.
          </p>
          <Link href="/account" className="btn-ghost mt-6">
            Back to my account
          </Link>
        </div>
      )}
    </AppShell>
  );
}
