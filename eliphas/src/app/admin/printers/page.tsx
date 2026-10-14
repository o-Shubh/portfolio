import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Printers" };

export default async function PrintersPage({ searchParams }: PageProps<"/admin/printers">) {
  await requireRole(["admin"]);
  const { added } = await searchParams;
  const supabase = await createClient();
  const { data: printers } = await supabase
    .from("printers")
    .select("id, name, contact_name, phone, city, state, active, user_id")
    .order("active", { ascending: false })
    .order("name");

  return (
    <>
      <PageHeader
        title="Printers"
        intro="Print partners who receive orders. Each logs in with the phone number listed here."
        action={
          <Link href="/admin/printers/new" className="btn-accent">
            <Plus className="h-5 w-5" aria-hidden /> Add printer
          </Link>
        }
      />
      {added && (
        <p role="status" className="mb-4 rounded-xl bg-success/15 p-3 font-medium text-success">
          Printer added. They can now log in with their phone number.
        </p>
      )}
      {!printers?.length ? (
        <div className="card text-center text-muted">No printers yet.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {printers.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/printers/${p.id}`} className={`card block transition hover:-translate-y-0.5 hover:shadow-lift ${p.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-heading text-lg font-semibold">{p.name}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.active ? "bg-success/15 text-success" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {p.active ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-muted">
                  {p.city}, {p.state}
                </p>
                <p className="mt-2 text-sm">
                  {p.contact_name && `${p.contact_name} · `}
                  {formatPhone(p.phone)}
                </p>
                <p className="mt-1 text-xs text-muted">{p.user_id ? "Has logged in" : "Not logged in yet"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
