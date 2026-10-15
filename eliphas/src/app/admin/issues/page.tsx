import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResolveForm } from "./ResolveForm";

export const metadata: Metadata = { title: "Issues" };

const KIND: Record<string, string> = { damaged: "Damaged", misprint: "Misprint", wrong_item: "Wrong book", not_delivered: "Not delivered" };

export default async function IssuesPage() {
  await requireRole(["admin"]);
  const db = createAdminClient();
  const { data: issues } = await db
    .from("order_issues")
    .select("*, orders!order_issues_order_id_fkey(order_number, ship_name, total, printer_id, printers(name))")
    .order("created_at", { ascending: false })
    .limit(100);
  const paths = (issues ?? []).flatMap((i) => i.photo_paths);
  const { data: links } = paths.length ? await db.storage.from("issue-photos").createSignedUrls(paths, 900) : { data: [] };
  const url = new Map((links ?? []).map((l, i) => [paths[i], l.signedUrl]));
  return (
    <>
      <PageHeader title="Order issues" intro="Damaged, misprinted, wrong or missing books. A replacement is a free reprint (no extra author earning); a refund reverses the order's author earnings." />
      {!issues?.length ? (
        <div className="card text-muted">No issues reported.</div>
      ) : (
        <ul className="space-y-3">
          {issues.map((i) => (
            <li key={i.id} className="card space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">
                  {KIND[i.kind]} · order {i.orders?.order_number} · {i.orders?.ship_name} · printer {i.orders?.printers?.name ?? "—"}
                </p>
                <span className="text-sm font-semibold">{i.status}</span>
              </div>
              <p className="text-sm">{i.description}</p>
              {i.photo_paths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {i.photo_paths.map((p) => (
                    <a key={p} href={url.get(p) ?? "#"} target="_blank" rel="noreferrer" className="text-sm underline">
                      Photo
                    </a>
                  ))}
                </div>
              )}
              {i.status === "open" ? (
                <ResolveForm issueId={i.id} />
              ) : (
                <p className="text-sm text-muted">
                  {i.resolution_note}
                  {i.replacement_order_id && (
                    <>
                      {" "}
                      · <Link href={`/admin/orders?q=`}>replacement order created</Link>
                    </>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
