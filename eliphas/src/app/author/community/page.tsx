import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewPostButton } from "./NewPostButton";

export const metadata: Metadata = { title: "Community", robots: { index: false } };

export default async function MyPostsPage() {
  const me = await requireRole(["author", "admin"]);
  const admin = createAdminClient();
  const { data: posts } = await admin
    .from("posts")
    .select("id, body, status, moderation, published_at, updated_at")
    .eq("author_id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (posts ?? []).map((p) => p.id);
  const [{ data: likes }, { data: comments }] = ids.length
    ? await Promise.all([
        admin.from("post_likes").select("post_id").in("post_id", ids),
        admin.from("post_comments").select("post_id").in("post_id", ids).eq("moderation", "visible"),
      ])
    : [{ data: [] }, { data: [] }];
  const tally = (list: { post_id: string }[] | null, id: string) => (list ?? []).filter((x) => x.post_id === id).length;

  return (
    <>
      <PageHeader
        title="Community"
        intro="Short updates for your readers: a new book, an event, a work in progress. Followers get one in-app notification when you publish."
        action={<NewPostButton />}
      />
      <p className="-mt-3 mb-6 text-sm text-muted">
        Writing something longer? Use{" "}
        <Link href="/author/articles" className="font-medium text-accent-fg hover:underline">
          My articles
        </Link>
        .
      </p>
      {!posts?.length ? (
        <EmptyState
          icon={MessagesSquare}
          title="No updates yet"
          text="Share news with your readers. Updates can have one image and link to one of your books."
          action={<NewPostButton />}
        />
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface ring-1 ring-line">
          {posts.map((p) => {
            const state =
              p.moderation !== "visible"
                ? { label: p.moderation === "removed" ? "Removed by our team" : "Hidden by our team", tone: "bg-danger/15 text-danger" }
                : p.status === "published"
                  ? { label: "Published", tone: "bg-success/15 text-success" }
                  : { label: "Draft", tone: "bg-surface-2 text-fg" };
            return (
              <li key={p.id}>
                <Link href={`/community/${p.id}/edit`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium">{p.body || "Empty draft"}</span>
                    <span className="text-sm text-muted mono">
                      {p.status === "published" && p.published_at
                        ? new Date(p.published_at).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })
                        : "Not published"}
                      {p.status === "published" && ` · ${tally(likes, p.id)} likes · ${tally(comments, p.id)} replies`}
                    </span>
                  </span>
                  <span className={`badge ${state.tone}`}>{state.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
