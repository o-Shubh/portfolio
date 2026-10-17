import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST_BUCKET = "post-images";
export const POST_LIMIT = 1000;
export const FEED_PAGE = 20;
export const postImageUrl = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_BUCKET}/${path}` : null;

export type FeedPost = {
  id: string;
  body: string;
  image_path: string | null;
  image_alt: string | null;
  published_at: string | null;
  edited_at: string | null;
  author: { id: string; full_name: string | null; handle: string | null; avatar_path: string | null } | null;
  book: { slug: string; title: string; status: string } | null;
  likes: number;
  comments: number;
  liked: boolean;
};

const COLUMNS =
  "id, body, image_path, image_alt, published_at, edited_at, author:profiles!posts_author_id_fkey(id, full_name, handle, avatar_path), book:books(slug, title, status)";

/**
 * Published, visible updates, newest first (chronological, no ranking).
 * "following" limits to authors the reader follows; blocked accounts (either way) are left out.
 */
export async function listPosts({ mode = "discover", userId = null, authorId, page = 1 }: { mode?: "discover" | "following"; userId?: string | null; authorId?: string; page?: number }) {
  const admin = createAdminClient();
  let authorIds: string[] | null = null;
  let hidden: string[] = [];
  if (userId) {
    const [{ data: follows }, { data: blocks }] = await Promise.all([
      admin.from("follows").select("author_id").eq("follower_id", userId),
      admin.from("user_blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    ]);
    hidden = (blocks ?? []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id));
    if (mode === "following") authorIds = (follows ?? []).map((f) => f.author_id);
  }
  if (mode === "following" && (!authorIds || authorIds.length === 0)) return { posts: [] as FeedPost[], total: 0 };

  let q = admin
    .from("posts")
    .select(COLUMNS, { count: "exact" })
    .eq("status", "published")
    .eq("moderation", "visible")
    .order("published_at", { ascending: false })
    .range((page - 1) * FEED_PAGE, page * FEED_PAGE - 1);
  if (authorId) q = q.eq("author_id", authorId);
  if (authorIds) q = q.in("author_id", authorIds);
  if (hidden.length) q = q.not("author_id", "in", `(${hidden.join(",")})`);
  const { data, count } = await q;
  const rows = (data ?? []) as unknown as Omit<FeedPost, "likes" | "comments" | "liked">[];
  return { posts: await withCounts(rows, userId), total: count ?? 0 };
}

/** Like and comment counts (always computed, so moderation and deletions keep them right) and the reader's own like. */
export async function withCounts(rows: Omit<FeedPost, "likes" | "comments" | "liked">[], userId: string | null): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const admin = createAdminClient();
  const ids = rows.map((r) => r.id);
  const [{ data: likes }, { data: comments }, { data: mine }] = await Promise.all([
    admin.from("post_likes").select("post_id").in("post_id", ids),
    admin.from("post_comments").select("post_id").in("post_id", ids).eq("moderation", "visible"),
    userId ? admin.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", userId) : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);
  const tally = (list: { post_id: string }[] | null, id: string) => (list ?? []).filter((x) => x.post_id === id).length;
  return rows.map((r) => ({
    ...r,
    book: r.book && r.book.status === "published" ? r.book : null,
    likes: tally(likes, r.id),
    comments: tally(comments, r.id),
    liked: (mine ?? []).some((m) => m.post_id === r.id),
  }));
}

/** One public update, or null for drafts, hidden or removed posts. */
export async function getPublicPost(id: string, userId: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("posts").select(COLUMNS).eq("id", id).eq("status", "published").eq("moderation", "visible").maybeSingle();
  if (!data) return null;
  return (await withCounts([data as unknown as Omit<FeedPost, "likes" | "comments" | "liked">], userId))[0];
}

/** Visible comments on an update, oldest first, with display names only (never contact details). */
export async function postComments(postId: string, hideFrom: Set<string>) {
  const { data } = await createAdminClient()
    .from("post_comments")
    .select("id, body, created_at, edited_at, user_id, who:profiles!post_comments_user_id_fkey(full_name, avatar_path)")
    .eq("post_id", postId)
    .eq("moderation", "visible")
    .order("created_at", { ascending: true })
    .limit(300);
  return (data ?? [])
    .filter((c) => !hideFrom.has(c.user_id))
    .map((c) => {
      const who = c.who as { full_name: string | null; avatar_path: string | null } | null;
      return { id: c.id, body: c.body, created_at: c.created_at, edited_at: c.edited_at, user_id: c.user_id, name: who?.full_name ?? "Reader", avatar: who?.avatar_path ?? null };
    });
}
