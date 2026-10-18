import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { qrOrigin } from "@/lib/edition-qr";
import { createAdminClient } from "@/lib/supabase/admin";
import { Backfill } from "./Backfill";

export const metadata: Metadata = { title: "Edition IDs" };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function AdminEditionsPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const [{ data: recent }, { count: total }] = await Promise.all([
    admin.from("edition_ids").select("eeid, assigned_at, assigned_via, book_id, book:books(id, title, status), by:profiles!edition_ids_assigned_by_fkey(full_name)").order("assigned_at", { ascending: false }).limit(30),
    admin.from("edition_ids").select("eeid", { count: "exact", head: true }),
  ]);
  const { origin, production, problem } = qrOrigin();

  return (
    <>
      <PageHeader
        title="Edition IDs"
        intro="Every approved edition gets a permanent Eliphas Edition ID (EEID) and a QR code to its public page at /e/{EEID}. EEIDs are our own identifiers, separate from ISBNs, and never reused."
      />
      <div className="max-w-3xl space-y-6">
        <section className="card" aria-labelledby="origin-h">
          <h2 id="origin-h" className="text-lg">QR address</h2>
          {production ? (
            <p className="mt-1 text-sm" data-testid="origin-ok">
              QR codes point to <strong>{origin}</strong>. Print downloads are on.
            </p>
          ) : (
            <p role="alert" className="mt-1 text-sm text-danger" data-testid="origin-missing">
              Print downloads are off: {problem} Set <code>PUBLIC_SITE_ORIGIN</code> to your production address (e.g. https://your-domain.in) in your hosting
              environment variables and redeploy. Previews currently use {origin}.
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="backfill-h">
          <h2 id="backfill-h" className="text-lg">Books published before Edition IDs</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            New approvals get an ID automatically. Published editions from before then don&apos;t, until you assign them here. Nothing runs by itself.
          </p>
          <Backfill />
        </section>

        <section className="card" aria-labelledby="recent-h">
          <h2 id="recent-h" className="text-lg">
            Recently assigned <span className="text-muted mono">({total ?? 0} in total)</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Find any edition by its exact EEID in the{" "}
            <Link href="/admin/review?status=all" className="underline">
              review queue search
            </Link>
            .
          </p>
          {!recent?.length ? (
            <p className="mt-3 text-sm text-muted">None yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {recent.map((r) => {
                const book = r.book as { id: string; title: string; status: string } | null;
                const by = (Array.isArray(r.by) ? r.by[0] : r.by) as { full_name: string | null } | null;
                return (
                  <li key={r.eeid} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0">
                      <span className="id-mono font-semibold">{r.eeid}</span>{" "}
                      {book ? (
                        <Link href={`/admin/books/${book.id}`} className="underline-offset-2 hover:underline">
                          {book.title}
                        </Link>
                      ) : (
                        <span className="text-muted">(book deleted; ID stays reserved)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted">
                      {r.assigned_via === "backfill" ? "Backfill" : "Approval"} · {when(r.assigned_at)} · {by?.full_name ?? "admin"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
