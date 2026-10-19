import type { Metadata } from "next";
import { Bell } from "lucide-react";
import Link from "next/link";
import { articleDate } from "@/components/ArticleCard";
import { ArticleNotificationToggle, MarkAllRead, PostNotificationToggle, PrefToggle, Unblock } from "@/components/articles/AccountControls";
import { profilePath } from "@/lib/posts";
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
      .select(
        "id, kind, title, link, read_at, created_at, article:articles(status, moderation), post:posts(status, moderation), actor:profiles!notifications_actor_id_fkey(full_name)",
      )
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("user_blocks").select("blocked_id, created_at, who:profiles!user_blocks_blocked_id_fkey(full_name)").eq("blocker_id", me.id),
    admin.from("follows").select("author_id, who:profiles!follows_author_id_fkey(full_name, handle, role)").eq("follower_id", me.id),
  ]);
  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <>
      <PageHeader title="Notifications" intro={unread ? `${unread} unread` : "You're all caught up."} action={unread ? <MarkAllRead /> : undefined} />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          {(items ?? []).length === 0 ? (
            <div className="card text-center">
              <Bell className="mx-auto h-7 w-7 text-muted" aria-hidden />
              <p className="mt-2 font-medium">No notifications yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Follow authors and readers to hear when they post. We&apos;ll also tell you when someone follows you or replies.
              </p>
            </div>
          ) : (
            <ul className="group-list">
              {(items ?? []).map((n) => {
                const content = n.kind === "new_post" || n.kind === "new_article";
                const art = (n.kind === "new_post" ? n.post : n.article) as { status: string; moderation: string } | null;
                const live = !content || (art?.status === "published" && art.moderation === "visible");
                const actor = (n.actor as { full_name: string | null } | null)?.full_name ?? (n.kind === "verification" ? "Eliphas team" : "Someone");
                const what =
                  n.kind === "new_post"
                    ? "posted in Community"
                    : n.kind === "new_article"
                      ? "published a new article"
                      : n.kind === "new_follower"
                        ? "started following you"
                        : n.kind === "reply"
                          ? "replied to you"
                          : "updated your author verification";
                return (
                  <li key={n.id} className="flex items-start gap-3 px-5 py-4" data-testid="notification" data-kind={n.kind}>
                    <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-gold"}`} />
                    <div className="min-w-0">
                      <p className="text-sm">
                        {!n.read_at && <span className="sr-only">Unread: </span>}
                        {n.kind === "verification" ? (
                          <span className="font-semibold">Author verification</span>
                        ) : (
                          <>
                            <span className="font-semibold">{actor}</span> {what}
                          </>
                        )}
                      </p>
                      {live ? (
                        <Link href={n.link} className="font-medium break-words underline-offset-2 hover:underline">
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
        </div>

        <div className="space-y-8 xl:sticky xl:top-24">
          <section aria-labelledby="notify-h">
            <h2 id="notify-h" className="mb-2 px-1 text-sm font-medium text-muted">
              Notify me about
            </h2>
            <div className="group-list">
              <ArticleNotificationToggle on={me.notify_new_articles} />
              <PostNotificationToggle on={me.notify_new_posts} />
              <PrefToggle field="notify_followers" on={me.notify_followers} label="New followers" hint="When someone starts following you." />
              <PrefToggle
                field="notify_replies"
                on={me.notify_replies}
                label="Replies and comments"
                hint="When someone comments on your post or article, replies to your comment, or an author responds to your review."
              />
            </div>
            <p className="mt-2 px-1 text-xs text-muted">
              Notifications appear here only, never by SMS, email or push. Verification decisions are always shown.
            </p>
          </section>

          <section aria-labelledby="follows-h">
            <h2 id="follows-h" className="mb-2 px-1 text-sm font-medium text-muted">
              People you follow
            </h2>
            {(follows ?? []).length === 0 ? (
              <p className="group-list group-row text-sm text-muted">You don&apos;t follow anyone yet.</p>
            ) : (
              <ul className="group-list">
                {(follows ?? []).map((f) => {
                  const who = f.who as { full_name: string | null; handle: string | null; role: string } | null;
                  return (
                    <li key={f.author_id} className="group-row text-[0.9375rem]">
                      {who?.handle ? (
                        <Link href={profilePath({ handle: who.handle, role: who.role })!} className="font-medium hover:underline">
                          {who.full_name}
                        </Link>
                      ) : (
                        (who?.full_name ?? "Author")
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="blocked-h">
            <h2 id="blocked-h" className="mb-2 px-1 text-sm font-medium text-muted">
              Blocked accounts
            </h2>
            {(blocks ?? []).length === 0 ? (
              <p className="group-list group-row text-sm text-muted">You haven&apos;t blocked anyone.</p>
            ) : (
              <ul className="group-list">
                {(blocks ?? []).map((b) => {
                  const name = (b.who as { full_name: string | null } | null)?.full_name ?? "Account";
                  return (
                    <li key={b.blocked_id} className="group-row justify-between text-[0.9375rem]">
                      <span>{name}</span>
                      <Unblock userId={b.blocked_id} name={name} />
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 px-1 text-xs text-muted">
              Blocked people can&apos;t follow you or comment on your posts and articles, you don&apos;t see their posts or comments, and they don&apos;t notify
              you. Blocking can&apos;t hide public pages from people who aren&apos;t logged in.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
