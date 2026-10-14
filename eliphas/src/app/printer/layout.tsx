import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { PRINTER_NAV } from "@/lib/nav";

export default async function PrinterLayout({ children }: LayoutProps<"/printer">) {
  const profile = await requireRole(["printer", "admin"]);
  return (
    <AppShell profile={profile} areaLabel="Printer" nav={PRINTER_NAV}>
      {children}
    </AppShell>
  );
}
