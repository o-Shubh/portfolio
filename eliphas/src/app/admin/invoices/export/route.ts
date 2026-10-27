import { requireRole } from "@/lib/auth";
import { monthRange, registerCsv, type RegisterInvoice } from "@/lib/invoice-format";
import { createAdminClient } from "@/lib/supabase/admin";

/** The month's invoice register as CSV for the accountant (credit notes negative). Admins only. */
export async function GET(req: Request) {
  await requireRole(["admin"]);
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const range = monthRange(month);
  if (!range) return new Response("Choose a month", { status: 400 });
  const kind = url.searchParams.get("kind");
  const test = url.searchParams.get("test") === "1";

  let query = createAdminClient()
    .from("invoices")
    .select(
      "number, kind, title, issued_at, is_test, buyer, place_of_supply, inter_state, lines, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise, credit_paise, paid_paise, payment_reference, original:original_invoice_id(number)",
    )
    .gte("issued_at", range.from)
    .lt("issued_at", range.to)
    .eq("is_test", test)
    .order("issued_at")
    .order("number");
  if (kind === "invoice" || kind === "credit_note") query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) return new Response("Could not load invoices", { status: 500 });

  const rows = (data ?? []).map((r) => ({ ...r, original_number: r.original?.number ?? null }) as unknown as RegisterInvoice);
  return new Response(registerCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eliphas-invoices-${month}${test ? "-test" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
