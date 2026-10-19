import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";
import { createAdminClient } from "@/lib/supabase/admin";
import { MessageForm } from "./MessageForm";

export const metadata: Metadata = { title: "Messages" };

const FILTERS = [
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "all", label: "All" },
] as const;
const TONE: Record<string, string> = { new: "bg-tint-info text-accent-fg", replied: "bg-tint-success text-success", closed: "bg-surface-3 text-muted" };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.value === sp.status)?.value ?? "new";
  let q = createAdminClient().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;

  return (
    <>
      <PageHeader title="Messages" intro="Messages from the Contact page. Reply by email or phone, then mark them replied." />
      <nav className="segmented mb-5" aria-label="Filter messages">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "new" ? "/admin/messages" : `/admin/messages?status=${f.value}`}
            aria-current={filter === f.value ? "page" : undefined}
            className="segment px-4"
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="notice-danger">
          Couldn&apos;t load messages. Check that migration 000022 has been applied.
        </p>
      ) : !data?.length ? (
        <p className="card text-center text-muted">{filter === "new" ? "No new messages." : "Nothing here."}</p>
      ) : (
        <ul className="space-y-4">
          {data.map((m) => (
            <li key={m.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {CONTACT_TOPICS[m.topic as ContactTopic] ?? m.topic}
                    {m.order_number && (
                      <>
                        {" "}
                        · <span className="id-mono">{m.order_number}</span>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {m.name} · <span className="select-all">{m.email}</span>
                    {m.phone ? ` · ${m.phone}` : ""} · {when(m.created_at)}
                    {m.user_id ? " · member" : " · guest"}
                  </p>
                </div>
                <span className={`badge whitespace-nowrap capitalize ${TONE[m.status] ?? ""}`}>{m.status}</span>
              </div>
              <p className="text-[0.9375rem] whitespace-pre-wrap">{m.message}</p>
              <MessageForm id={m.id} status={m.status} note={m.admin_note ?? ""} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
