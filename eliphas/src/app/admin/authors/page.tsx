import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { timeAgo } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DecisionForm, NoteAction } from "./AuthorForms";

export const metadata: Metadata = { title: "Authors" };

const VIEWS = [
  { value: "applications", label: "Applications" },
  { value: "existing", label: "Existing authors to review" },
  { value: "verified", label: "Verified" },
  { value: "history", label: "History" },
] as const;
const LANG: Record<string, string> = { en: "English", hi: "Hindi", both: "English and Hindi" };

export default async function AdminAuthorsPage({ searchParams }: PageProps<"/admin/authors">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.value === sp.view)?.value ?? "applications";
  const admin = createAdminClient();
  const { count: waiting } = await admin.from("author_applications").select("*", { count: "exact", head: true }).eq("status", "pending");

  return (
    <>
      <PageHeader title="Authors" intro="Verify author profiles. The badge confirms the profile belongs to the author; it doesn't endorse opinions or books, and it's separate from Pro. Unverified authors keep their books and posts." />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {VIEWS.map((v) => (
          <Link key={v.value} href={`/admin/authors?view=${v.value}`} aria-current={view === v.value ? "true" : undefined} className="chip bg-surface">
            {v.label}
            {v.value === "applications" && waiting ? ` (${waiting})` : ""}
          </Link>
        ))}
      </div>
      {view === "applications" && <Applications />}
      {view === "existing" && <Existing />}
      {view === "verified" && <Verified />}
      {view === "history" && <History />}
    </>
  );
}

const who = (w: unknown) => (w as { full_name: string | null; handle: string | null } | null) ?? { full_name: null, handle: null };

async function Applications() {
  const { data } = await createAdminClient()
    .from("author_applications")
    .select("*, who:profiles!author_applications_user_id_fkey(full_name, handle, role)")
    .in("status", ["pending", "changes_requested"])
    .order("created_at");
  if (!data?.length) return <p className="card text-sm text-muted">No applications waiting.</p>;
  return (
    <ul className="space-y-4">
      {data.map((a) => (
        <li key={a.id} className="card" data-testid="application">
          <p className="text-xs font-semibold text-muted uppercase">
            {a.status === "pending" ? "Waiting" : "Changes requested"} · sent {timeAgo(a.created_at)}
          </p>
          <p className="mt-1 text-lg font-semibold">{a.pen_name}</p>
          <p className="text-sm text-muted">
            Account: {who(a.who).full_name} · writes in {LANG[a.language]}
          </p>
          <p className="mt-2 whitespace-pre-line">{a.bio}</p>
          <div className="mt-3 rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm">
            <p className="font-semibold">Evidence (private)</p>
            <p className="mt-1 break-words whitespace-pre-line">{a.evidence}</p>
          </div>
          {a.decision_note && <p className="mt-2 text-sm text-muted">Last note: {a.decision_note}</p>}
          {a.status === "pending" && <DecisionForm applicationId={a.id} />}
        </li>
      ))}
    </ul>
  );
}

async function Existing() {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, full_name, handle, created_at").eq("role", "author").is("verified_author_at", null).order("created_at");
  const ids = (data ?? []).map((p) => p.id);
  const { data: books } = ids.length ? await admin.from("books").select("author_id, status").in("author_id", ids) : { data: [] };
  const live = (id: string) => (books ?? []).filter((b) => b.author_id === id && b.status === "published").length;
  if (!data?.length) return <p className="card text-sm text-muted">Every author is verified or has applied.</p>;
  return (
    <>
      <p className="mb-3 text-sm text-muted">Authors who joined before verification existed, or haven&apos;t applied. Nothing is hidden or unpublished; check their profile and books, then verify or leave as is.</p>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
        {data.map((p) => (
          <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3" data-testid="existing-author">
            <span>
              <span className="block font-semibold">{p.full_name}</span>
              <span className="text-sm text-muted">
                {live(p.id)} live {live(p.id) === 1 ? "book" : "books"}
                {p.handle && (
                  <>
                    {" · "}
                    <Link href={`/authors/${p.handle}`} className="underline" target="_blank">
                      Public profile
                    </Link>
                  </>
                )}
              </span>
            </span>
            <NoteAction userId={p.id} kind="verify" />
          </li>
        ))}
      </ul>
    </>
  );
}

async function Verified() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, handle, verified_author_at, verified_author_by")
    .not("verified_author_at", "is", null)
    .order("verified_author_at", { ascending: false });
  // Reviewer names (a self-referencing embed can't be expressed reliably, so look them up)
  const reviewerIds = [...new Set((data ?? []).map((p) => p.verified_author_by).filter((x): x is string => Boolean(x)))];
  const { data: reviewers } = reviewerIds.length ? await admin.from("profiles").select("id, full_name").in("id", reviewerIds) : { data: [] };
  const reviewer = (id: string | null) => (reviewers ?? []).find((r) => r.id === id)?.full_name ?? "admin";
  if (!data?.length) return <p className="card text-sm text-muted">No verified authors yet.</p>;
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
      {data.map((p) => (
        <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <span>
            <span className="flex items-center gap-2 font-semibold">
              {p.full_name} <VerifiedBadge compact />
            </span>
            <span className="text-sm text-muted">
              Verified {new Date(p.verified_author_at!).toLocaleDateString("en-IN", { dateStyle: "medium" })} by {reviewer(p.verified_author_by)}
            </span>
          </span>
          <NoteAction userId={p.id} kind="revoke" />
        </li>
      ))}
    </ul>
  );
}

async function History() {
  const { data } = await createAdminClient()
    .from("author_verification_events")
    .select("id, status, note, created_at, who:profiles!author_verification_events_user_id_fkey(full_name), actor:profiles!author_verification_events_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data?.length) return <p className="card text-sm text-muted">No verification activity yet.</p>;
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
      {data.map((e) => (
        <li key={e.id} className="px-4 py-3 text-sm">
          <span className="font-semibold">{who(e.who).full_name}</span> · {e.status.replace("_", " ")} by {who(e.actor).full_name ?? "system"} · {timeAgo(e.created_at)}
          {e.note && <span className="block text-muted">{e.note}</span>}
        </li>
      ))}
    </ul>
  );
}
