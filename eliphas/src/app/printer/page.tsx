import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Print jobs" };

export default async function PrinterHome() {
  const profile = await requireRole(["printer", "admin"]);
  const supabase = await createClient();
  const { data: printer } = await supabase
    .from("printers")
    .select("name, city, state")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Print jobs"
        intro={printer ? `${printer.name} · ${printer.city}, ${printer.state}` : "Your print queue."}
      />
      {!printer && profile.role === "printer" && (
        <div className="card mb-4 ring-2 ring-marigold/50">
          Your login isn&apos;t linked to a print shop yet. Ask the admin to add your phone number in the printer list.
        </div>
      )}
      <ComingSoon milestone={5} items={["New paid orders to print", "Download print-ready files", "Mark printed", "Mark shipped with tracking number"]} />
    </>
  );
}
