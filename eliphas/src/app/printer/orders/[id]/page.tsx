import { ArrowLeft, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { requireRole } from "@/lib/auth";
import { fullCoverSize } from "@/lib/publishing";
import { formatPhone } from "@/lib/phone";
import { myPrinter } from "@/lib/printer";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdvanceForm } from "./AdvanceForm";

export const metadata: Metadata = { title: "Print job" };

export default async function PrintJobPage({ params }: PageProps<"/printer/orders/[id]">) {
  const profile = await requireRole(["printer", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: o } = await admin
    .from("orders")
    .select(
      "*, order_items(id, quantity, file_snapshot, books(id, title, author_name, page_count, trim_size, binding, interior, paper, cover_finish, manuscript_path, print_cover_path, isbn))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  // Only the assigned printer (or an admin) may see this job
  if (profile.role !== "admin") {
    const printer = await myPrinter(profile.id);
    if (!printer || printer.id !== o.printer_id) notFound();
  }

  const { rates } = await getPricingSettings();
  const label = (g: Record<string, { label: string }>, k: string) => g[k]?.label ?? k;
  const sign = async (path: string | null) =>
    path ? ((await admin.storage.from("manuscripts").createSignedUrl(path, 3600)).data?.signedUrl ?? null) : null;
  const items = await Promise.all(
    o.order_items.map(async (it) => ({
      ...it,
      // Print the approved files recorded for this order; older orders fall back to the book's files
      manuscript: await sign((it.file_snapshot as { manuscript_path?: string } | null)?.manuscript_path ?? it.books?.manuscript_path ?? null),
      printCover: await sign((it.file_snapshot as { print_cover_path?: string } | null)?.print_cover_path ?? it.books?.print_cover_path ?? null),
      versions: it.file_snapshot as { manuscript_version?: number | null; print_cover_version?: number | null } | null,
      cover: it.books ? fullCoverSize(it.books, rates) : null,
    })),
  );

  return (
    <>
      <Link href="/printer" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Print jobs
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{o.order_number}</h1>
        <OrderStatusBadge status={o.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {items.map((it) => (
            <section key={it.id} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl">{it.books?.title}</h2>
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-on-accent">
                  {it.quantity} {it.quantity === 1 ? "copy" : "copies"}
                </span>
              </div>
              <p className="text-muted">by {it.books?.author_name}</p>
              {it.books && (
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                  {[
                    ["Pages", it.books.page_count],
                    ["Size", label(rates.trim_sizes, it.books.trim_size)],
                    ["Inside", label(rates.interior, it.books.interior)],
                    ["Paper", label(rates.paper, it.books.paper)],
                    ["Binding", label(rates.binding, it.books.binding)],
                    ["Finish", label(rates.cover_finish, it.books.cover_finish)],
                    ...(it.cover ? [["Spine", `${it.cover.spineMm} mm`]] : []),
                    ...(it.books.isbn ? [["ISBN", it.books.isbn]] : []),
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <dt className="text-sm text-muted">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                {it.manuscript && (
                  <a href={it.manuscript} target="_blank" rel="noreferrer" className="btn-ghost">
                    <Download className="h-4 w-4" aria-hidden /> Inside pages PDF{it.versions?.manuscript_version ? ` (approved v${it.versions.manuscript_version})` : ""}
                  </a>
                )}
                {it.printCover && (
                  <a href={it.printCover} target="_blank" rel="noreferrer" className="btn-ghost">
                    <Download className="h-4 w-4" aria-hidden /> Cover PDF{it.versions?.print_cover_version ? ` (approved v${it.versions.print_cover_version})` : ""}
                  </a>
                )}
              </div>
            </section>
          ))}

          <section className="card">
            <h2 className="mb-5 text-xl">Progress</h2>
            <OrderTimeline order={o} />
          </section>
        </div>

        {/* On phones the next-step button comes first */}
        <aside className="order-first space-y-6 lg:order-none">
          <section className="card">
            <AdvanceForm orderId={o.id} status={o.status} />
          </section>
          <section className="card text-sm">
            <h2 className="mb-2 text-lg">Ship to</h2>
            <p className="font-semibold">{o.ship_name}</p>
            <p className="text-muted select-all">
              {o.ship_line1}
              {o.ship_line2 && `, ${o.ship_line2}`}
              <br />
              {o.ship_city}, {o.ship_state} {o.ship_pincode}
            </p>
            <p className="mt-2 font-medium">{formatPhone(o.ship_phone)}</p>
            {o.tracking_number && (
              <p className="mt-3 rounded-xl bg-surface-2 p-3">
                {o.courier}: <span className="font-semibold">{o.tracking_number}</span>
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
