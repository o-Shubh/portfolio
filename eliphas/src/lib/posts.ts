import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST_BUCKET = "post-images";
export const POST_LIMIT = 3000;
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
  author: { id: string; full_name: string | null; handle: string | null; avatar_path: string | null; role: string; verified_author_at: string | null } | null;
  book: { slug: string; title: string; status: string } | null;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
};

/** Public profile link: authors have /authors/…, everyone else /u/… */
export const profilePath = (a: { handle: string | null; role?: string } | null) =>
  a?.handle ? (a.role === "author" || a.role === "admin" ? `/authors/${a.handle}` : `/u/${a.handle}`) : null;

const COLUMNS =
  "id, body, image_path, image_alt, published_at, edited_at, author:profiles!posts_author_id_fkey(id, full_name, handle, avatar_path, role, verified_author_at), book:books(slug, title, status)";

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
  const rows = (data ?? []) as unknown as Omit<FeedPost, "likes" | "comments" | "liked" | "saved">[];
  return { posts: await withCounts(rows, userId), total: count ?? 0 };
}

/** Like and comment counts (always computed, so moderation and deletions keep them right) and the reader's own like. */
export async function withCounts(rows: Omit<FeedPost, "likes" | "comments" | "liked" | "saved">[], userId: string | null): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const admin = createAdminClient();
  const ids = rows.map((r) => r.id);
  const none = Promise.resolve({ data: [] as { post_id: string }[] });
  const [{ data: likes }, { data: comments }, { data: mine }, { data: saved }] = await Promise.all([
    admin.from("post_likes").select("post_id").in("post_id", ids),
    admin.from("post_comments").select("post_id").in("post_id", ids).eq("moderation", "visible"),
    userId ? admin.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", userId) : none,
    userId ? admin.from("post_bookmarks").select("post_id").in("post_id", ids).eq("user_id", userId) : none,
  ]);
  const tally = (list: { post_id: string }[] | null, id: string) => (list ?? []).filter((x) => x.post_id === id).length;
  return rows.map((r) => ({
    ...r,
    book: r.book && r.book.status === "published" ? r.book : null,
    likes: tally(likes, r.id),
    comments: tally(comments, r.id),
    liked: (mine ?? []).some((m) => m.post_id === r.id),
    saved: (saved ?? []).some((m) => m.post_id === r.id),
  }));
}

/** Posts the reader has saved (private to them), newest save first. Hidden, removed or deleted posts drop out. */
export async function savedPosts(userId: string) {
  const admin = createAdminClient();
  const { data: marks } = await admin.from("post_bookmarks").select("post_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
  const ids = (marks ?? []).map((m) => m.post_id);
  if (!ids.length) return [];
  const { data } = await admin.from("posts").select(COLUMNS).in("id", ids).eq("status", "published").eq("moderation", "visible");
  const rows = (data ?? []) as unknown as Omit<FeedPost, "likes" | "comments" | "liked" | "saved">[];
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return withCounts(rows, userId);
}

/** One public update, or null for drafts, hidden or removed posts. */
export async function getPublicPost(id: string, userId: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("posts").select(COLUMNS).eq("id", id).eq("status", "published").eq("moderation", "visible").maybeSingle();
  if (!data) return null;
  return (await withCounts([data as unknown as Omit<FeedPost, "likes" | "comments" | "liked" | "saved">], userId))[0];
}

export const COMMENTS_PAGE = 30;

/**
 * Visible comments on a post with their replies (two levels), oldest first, paginated by top-level comment.
 * Display names and photos only (never contact details). Comments from blocked accounts are left out.
 */
export async function postComments(postId: string, hideFrom: Set<string>, page = 1) {
  const admin = createAdminClient();
  const cols = "id, body, created_at, edited_at, user_id, parent_id, who:profiles!post_comments_user_id_fkey(full_name, avatar_path, handle, role, verified_author_at)";
  const { data: top, count } = await admin
    .from("post_comments")
    .select(cols, { count: "exact" })
    .eq("post_id", postId)
    .eq("moderation", "visible")
    .is("parent_id", null)
    .order("created_at", { ascending: true })
    .range((page - 1) * COMMENTS_PAGE, page * COMMENTS_PAGE - 1);
  const ids = (top ?? []).map((c) => c.id);
  const { data: replies } = ids.length
    ? await admin.from("post_comments").select(cols).in("parent_id", ids).eq("moderation", "visible").order("created_at", { ascending: true }).limit(1000)
    : { data: [] };
  const shape = (c: NonNullable<typeof top>[number]) => {
    const who = c.who as { full_name: string | null; avatar_path: string | null; handle: string | null; role: string; verified_author_at: string | null } | null;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      edited_at: c.edited_at,
      user_id: c.user_id,
      parent_id: c.parent_id,
      name: who?.full_name ?? "Reader",
      avatar: who?.avatar_path ?? null,
      profile: profilePath(who ? { handle: who.handle, role: who.role } : null),
      verified: Boolean(who?.verified_author_at),
    };
  };
  const all = [...(top ?? []), ...(replies ?? [])].filter((c) => !hideFrom.has(c.user_id)).map(shape);
  return { comments: all, totalTop: count ?? 0 };
}
