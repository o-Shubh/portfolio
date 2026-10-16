import type { Metadata } from "next";
import Link from "next/link";
import { articleDate } from "@/components/ArticleCard";
import { ArticleNotificationToggle, MarkAllRead, Unblock } from "@/components/articles/AccountControls";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const me = await requireRole(["reader", "author", "printer", "admin"]);
  const admin = createAdminClient();
  const [{ data: items }, { data: blocks }, { data: follows }] = await Promise.all([
    admin
      .from("notifications")
      .select("id, title, link, read_at, created_at, article:articles(status, moderation), actor:profiles!notifications_actor_id_fkey(full_name)")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("user_blocks").select("blocked_id, created_at, who:profiles!user_blocks_blocked_id_fkey(full_name)").eq("blocker_id", me.id),
    admin.from("follows").select("author_id, who:profiles!follows_author_id_fkey(full_name, handle)").eq("follower_id", me.id),
  ]);
  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <>
      <PageHeader title="Notifications" intro={unread ? `${unread} unread` : "You're all caught up."} action={unread ? <MarkAllRead /> : undefined} />
      <div className="max-w-2xl space-y-8">
        {(items ?? []).length === 0 ? (
          <p className="card text-sm text-muted">No notifications yet. Follow authors to hear when they publish a new article.</p>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {(items ?? []).map((n) => {
              const art = n.article as { status: string; moderation: string } | null;
              const live = art?.status === "published" && art.moderation === "visible";
              const actor = (n.actor as { full_name: string | null } | null)?.full_name ?? "An author";
              return (
                <li key={n.id} className="flex items-start gap-3 px-5 py-4" data-testid="notification">
                  <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-gold"}`} />
                  <div className="min-w-0">
                    <p className="text-sm">
                      {!n.read_at && <span className="sr-only">Unread: </span>}
                      <span className="font-semibold">{actor}</span> published a new article
                    </p>
                    {live ? (
                      <Link href={n.link} className="font-medium underline-offset-2 hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-muted">{n.title} (no longer available)</p>
                    )}
                    <p className="text-xs text-muted">{articleDate(n.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <section className="card space-y-4">
          <h2 className="text-lg">Settings</h2>
          <ArticleNotificationToggle on={me.notify_new_articles} />
        </section>

        <section className="card">
          <h2 className="text-lg">Authors you follow</h2>
          {(follows ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted">You don&apos;t follow anyone yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {(follows ?? []).map((f) => {
                const who = f.who as { full_name: string | null; handle: string | null } | null;
                return (
                  <li key={f.author_id} className="py-2.5 text-sm">
                    {who?.handle ? (
                      <Link href={`/authors/${who.handle}`} className="font-medium hover:underline">
                        {who.full_name}
                      </Link>
                    ) : (
                      who?.full_name ?? "Author"
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg">Blocked accounts</h2>
          <p className="mt-1 text-sm text-muted">Blocked people can&apos;t comment on your articles or follow you, and you don&apos;t see their comments.</p>
          {(blocks ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted">You haven&apos;t blocked anyone.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {(blocks ?? []).map((b) => {
                const name = (b.who as { full_name: string | null } | null)?.full_name ?? "Account";
                return (
                  <li key={b.blocked_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>{name}</span>
                    <Unblock userId={b.blocked_id} name={name} />
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
