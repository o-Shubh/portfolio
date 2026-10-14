import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  // Admin RLS rules allow counting everything.
  const [people, books, printers] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("printers").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "People", value: people.count ?? 0 },
    { label: "Books", value: books.count ?? 0 },
    { label: "Printers", value: printers.count ?? 0 },
  ];

  return (
    <>
      <PageHeader title="Admin overview" />
      <dl className="mb-6 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="mt-1 font-heading text-3xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <ComingSoon milestone={4} items={["Review queue: approve or send back", "Printer list", "Author payouts", "Edit print rates"]} />
    </>
  );
}
