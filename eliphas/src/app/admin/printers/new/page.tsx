import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { PrinterForm } from "../PrinterForm";

export const metadata: Metadata = { title: "Add printer" };

export default async function NewPrinterPage() {
  await requireRole(["admin"]);
  return (
    <>
      <Link href="/admin/printers" className="text-sm font-medium text-muted hover:text-fg">
        ← Printers
      </Link>
      <PageHeader title="Add printer" intro="They'll get printer access when they log in with this mobile number." />
      <PrinterForm printer={null} />
    </>
  );
}
