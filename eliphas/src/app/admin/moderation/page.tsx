import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { timeAgo } from "@/lib/admin";
import { articlePath } from "@/lib/article-format";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModerateForm, RestrictForm } from "./ModForms";

export const metadata: Metadata = { title: "Moderation" };

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  abuse: "Harassment",
  hate: "Hate speech",
  copyright: "Copyright",
  "private-info": "Private information",
  other: "Other",
};
const VIEWS = [
  { value: "open", label: "Open reports" },
  { value: "hidden", label: "Hidden content" },
  { value: "restricted", label: "Restricted accounts" },
  { value: "log", label: "Log" },
] as const;

export default async function ModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.value === sp.view)?.value ?? "open";
  const admin = createAdminClient();
  const { count: openCount } = await admin.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "open");

  return (
    <>
      <PageHeader
        title="Moderation"
        intro="Authors publish articles straight away. Readers report problems; you review them here. Every decision needs a reason and is logged. We don't run automated plagiarism or AI checks."
      />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/admin/moderation?view=${v.value}`}
            aria-current={view === v.value ? "true" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${view === v.value ? "bg-accent text-on-accent" : "bg-surface-2 text-fg"}`}
          >
            {v.label}
            {v.value === "open" && openCount ? ` (${openCount})` : ""}
          </Link>
        ))}
      </div>
      {view === "open" && <OpenReports />}
      {view === "hidden" && <HiddenContent />}
      {view === "restricted" && <Restricted />}
      {view === "log" && <Log />}
    </>
  );
}

async function OpenReports() {
  const admin = createAdminClient();
  const { data: reports } = await admin.from("content_reports").select("id, target_type, target_id, reason, details, created_at").eq("status", "open").order("created_at").limit(300);
  if (!reports?.length) return <p className="card text-sm text-muted">No open reports.</p>;

  // Group reports by the item they're about
  const groups = new Map<string, { type: "article" | "comment"; id: string; reports: typeof reports }>();
  for (const r of reports) {
    const key = `${r.target_type}:${r.target_id}`;
    if (!groups.has(key)) groups.set(key, { type: r.target_type as "article" | "comment", id: r.target_id, reports: [] });
    groups.get(key)!.reports.push(r);
  }
  const articleIds = [...groups.values()].filter((g) => g.type === "article").map((g) => g.id);
  const commentIds = [...groups.values()].filter((g) => g.type === "comment").map((g) => g.id);
  const [{ data: articles }, { data: comments }] = await Promise.all([
    articleIds.length
      ? admin.from("articles").select("id, short_id, slug, title, excerpt, status, moderation, author_id, author:profiles!articles_author_id_fkey(full_name)").in("id", articleIds)
      : Promise.resolve({ data: [] as never[] }),
    commentIds.length
      ? admin.from("article_comments").select("id, body, moderation, user_id, who:profiles!article_comments_user_id_fkey(full_name), article:articles(short_id, slug, title)").in("id", commentIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  return (
    <ul className="space-y-4">
      {[...groups.values()].map((g) => {
        const a = g.type === "article" ? articles?.find((x) => x.id === g.id) : null;
        const c = g.type === "comment" ? comments?.find((x) => x.id === g.id) : null;
        const owner = a ? { id: a.author_id, name: (a.author as { full_name: string | null } | null)?.full_name ?? "Author" } : c ? { id: c.user_id, name: (c.who as { full_name: string | null } | null)?.full_name ?? "Reader" } : null;
        const mod = a?.moderation ?? c?.moderation;
        return (
          <li key={`${g.type}:${g.id}`} className="card" data-testid="report-group" data-type={g.type}>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              {g.type} · {g.reports.length} report{g.reports.length === 1 ? "" : "s"} · {mod}
            </p>
            {a && (
              <>
                <p className="mt-1 text-lg font-semibold">
                  {a.status === "published" && a.moderation === "visible" ? (
                    <Link href={articlePath(a)} className="hover:underline" target="_blank">
                      {a.title}
                    </Link>
                  ) : (
                    a.title
                  )}
                </p>
                <p className="line-clamp-2 text-sm text-muted">{a.excerpt}</p>
                <p className="mt-1 text-sm">By {owner?.name}</p>
              </>
            )}
            {c && (
              <>
                <blockquote className="mt-1 border-l-2 border-gold pl-3 whitespace-pre-line">{c.body}</blockquote>
                <p className="mt-1 text-sm">
                  By {owner?.name} on{" "}
                  {(() => {
                    const art = c.article as { short_id: string; slug: string; title: string } | null;
                    return art ? (
                      <Link href={articlePath(art)} className="underline" target="_blank">
                        {art.title}
                      </Link>
                    ) : (
                      "a deleted article"
                    );
                  })()}
                </p>
              </>
            )}
            {!a && !c && <p className="mt-1 text-sm text-muted">This item was deleted by its author.</p>}
            <ul className="mt-3 space-y-1 text-sm">
              {g.reports.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{REASON_LABEL[r.reason]}</span>
                  <span className="text-muted"> · {timeAgo(r.created_at)}</span>
                  {r.details && <span className="block text-muted">“{r.details}”</span>}
                </li>
              ))}
            </ul>
            {(a || c) && <ModerateForm targetType={g.type} targetId={g.id} actions={mod === "visible" ? ["hide", "remove", "dismiss"] : ["restore", "remove", "dismiss"]} />}
            {!(a || c) && <ModerateForm targetType={g.type} targetId={g.id} actions={["dismiss"]} />}
            {owner && (
              <div className="mt-3 border-t border-line pt-3">
                <RestrictForm userId={owner.id} name={owner.name} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

async function HiddenContent() {
  const admin = createAdminClient();
  const [{ data: articles }, { data: comments }] = await Promise.all([
    admin.from("articles").select("id, title, moderation, moderation_reason, updated_at").neq("moderation", "visible").order("updated_at", { ascending: false }).limit(100),
    admin.from("article_comments").select("id, body, moderation, created_at").neq("moderation", "visible").order("created_at", { ascending: false }).limit(100),
  ]);
  if (!articles?.length && !comments?.length) return <p className="card text-sm text-muted">Nothing is hidden or removed.</p>;
  return (
    <ul className="space-y-3">
      {(articles ?? []).map((a) => (
        <li key={a.id} className="card">
          <p className="text-xs font-semibold text-muted uppercase">Article · {a.moderation}</p>
          <p className="font-semibold">{a.title || "Untitled"}</p>
          {a.moderation_reason && <p className="text-sm text-muted">Reason: {a.moderation_reason}</p>}
          <ModerateForm targetType="article" targetId={a.id} actions={a.moderation === "hidden" ? ["restore", "remove"] : ["restore"]} />
        </li>
      ))}
      {(comments ?? []).map((c) => (
        <li key={c.id} className="card">
          <p className="text-xs font-semibold text-muted uppercase">Comment · {c.moderation}</p>
          <p className="line-clamp-3 whitespace-pre-line">{c.body}</p>
          <ModerateForm targetType="comment" targetId={c.id} actions={c.moderation === "hidden" ? ["restore", "remove"] : ["restore"]} />
        </li>
      ))}
    </ul>
  );
}

async function Restricted() {
  const { data } = await createAdminClient()
    .from("account_restrictions")
    .select("user_id, reason, until, created_at, who:profiles!account_restrictions_user_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (!data?.length) return <p className="card text-sm text-muted">No accounts are restricted.</p>;
  return (
    <ul className="space-y-3">
      {data.map((r) => {
        const name = (r.who as { full_name: string | null } | null)?.full_name ?? "Account";
        return (
          <li key={r.user_id} className="card">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted">
              {r.reason} · {r.until ? `until ${new Date(r.until).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}` : "until lifted"}
            </p>
            <div className="mt-2">
              <RestrictForm userId={r.user_id} name={name} lift />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function Log() {
  const { data } = await createAdminClient()
    .from("moderation_actions")
    .select("id, target_type, target_id, action, reason, created_at, actor:profiles!moderation_actions_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data?.length) return <p className="card text-sm text-muted">No moderation decisions yet.</p>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Admin</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2.5 whitespace-nowrap">{timeAgo(m.created_at)}</td>
              <td className="px-4 py-2.5">{(m.actor as { full_name: string | null } | null)?.full_name}</td>
              <td className="px-4 py-2.5 font-medium">{m.action}</td>
              <td className="px-4 py-2.5 text-muted">
                {m.target_type} {m.target_id.slice(0, 8)}
              </td>
              <td className="px-4 py-2.5">{m.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
