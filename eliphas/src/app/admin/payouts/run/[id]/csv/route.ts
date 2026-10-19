import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// One CSV cell: quoted, inner quotes doubled, and formula-looking text neutralised for spreadsheet apps
const cell = (v: string | number | null | undefined) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** The payout sheet for a run: name, UPI, amount and a reference to quote in the transfer. Admins only. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/payouts/run/[id]/csv">) {
  await requireRole(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const { data: items } = await createAdminClient()
    .from("payouts")
    .select("id, amount, upi, status, profiles!payouts_author_id_fkey(full_name, phone)")
    .eq("run_id", id)
    .eq("status", "pending")
    .order("amount", { ascending: false });
  const rows = [
    ["Name", "UPI ID", "Amount (INR)", "Reference", "Phone"],
    ...(items ?? []).map((p) => [
      p.profiles?.full_name ?? "",
      p.upi ?? "",
      Number(p.amount).toFixed(2),
      `ELIPHAS-${p.id.slice(0, 8).toUpperCase()}`,
      p.profiles?.phone ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eliphas-payouts-${id.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
