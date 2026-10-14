import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrinterForm } from "../PrinterForm";

export const metadata: Metadata = { title: "Edit printer" };

export default async function EditPrinterPage({ params }: PageProps<"/admin/printers/[id]">) {
  await requireRole(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: printer } = await supabase.from("printers").select("*").eq("id", id).maybeSingle();
  if (!printer) notFound();

  return (
    <>
      <Link href="/admin/printers" className="text-sm font-medium text-muted hover:text-fg">
        ← Printers
      </Link>
      <PageHeader title={printer.name} intro={printer.user_id ? "Linked to a login." : "Hasn't logged in yet."} />
      <PrinterForm printer={printer} />
    </>
  );
}
