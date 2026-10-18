import "server-only";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import type { Block } from "@/lib/article-format";
import { createAdminClient } from "@/lib/supabase/admin";

export type Article = Database["public"]["Tables"]["articles"]["Row"];
export const PUBLIC_ARTICLE_FILTER = { status: "published", moderation: "visible" } as const;
export const COVER_BUCKET = "article-covers";
export const PAGE_SIZE = 12;

export const coverUrl = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COVER_BUCKET}/${path}` : null;
export const bodyBlocks = (a: Pick<Article, "body">) => (Array.isArray(a.body) ? (a.body as unknown as Block[]) : []);

/** Public handle for an author's page: from the name, plus a few characters so it's unique. Set once. */
export async function ensureHandle(profile: { id: string; full_name: string | null; handle: string | null }) {
  if (profile.handle) return profile.handle;
  const base =
    (profile.full_name ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "author";
  const admin = createAdminClient();
  for (let i = 0; i < 5; i++) {
    const handle = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await admin.from("profiles").update({ handle }).eq("id", profile.id).is("handle", null).select("handle");
    if (data?.length) return handle;
    const { data: cur } = await admin.from("profiles").select("handle").eq("id", profile.id).single();
    if (cur?.handle) return cur.handle;
  }
  throw new Error("Could not create a profile handle");
}

/** Accounts an admin has restricted from posting. */
export async function isRestricted(userId: string) {
  const { data } = await createAdminClient().from("account_restrictions").select("until").eq("user_id", userId).maybeSingle();
  return Boolean(data && (!data.until || new Date(data.until) > new Date()));
}

/** Simple rate limit: at most `max` rows by this user in the last `seconds` (counted on the table itself). */
export async function overLimit(table: "article_comments" | "content_reports" | "articles" | "posts" | "post_comments" | "book_reviews", userCol: string, userId: string, max: number, seconds: number) {
  const since = new Date(Date.now() - seconds * 1000).toISOString();
  const { count } = await createAdminClient()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(userCol, userId)
    .gte("created_at", since);
  return (count ?? 0) >= max;
}

/** Whether either user blocked the other. */
export async function blockedBetween(a: string, b: string) {
  const { count } = await createAdminClient()
    .from("user_blocks")
    .select("*", { count: "exact", head: true })
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);
  return (count ?? 0) > 0;
}

export { COVER_MAX_BYTES, processCover } from "@/lib/images";

export const VIEWER_COOKIE = "eip_vid";
/** Who is viewing, for de-duplicating views: the account, or a random id kept in a first-party cookie. */
export async function viewerKey(userId: string | null): Promise<{ key: string; newCookie: string | null }> {
  if (userId) return { key: `u:${userId}`, newCookie: null };
  const existing = (await cookies()).get(VIEWER_COOKIE)?.value;
  if (existing && /^[a-f0-9-]{36}$/.test(existing)) return { key: `b:${existing}`, newCookie: null };
  const id = crypto.randomUUID();
  return { key: `b:${id}`, newCookie: id };
}

export type ArticleCard = Pick<Article, "id" | "short_id" | "slug" | "title" | "excerpt" | "cover_path" | "cover_alt" | "language" | "topic" | "published_at" | "word_count"> & {
  author: { id: string; full_name: string | null; handle: string | null; avatar_path?: string | null; verified_author_at?: string | null } | null;
};
const CARD_COLUMNS = "id, short_id, slug, title, excerpt, cover_path, cover_alt, language, topic, published_at, word_count, author:profiles!articles_author_id_fkey(id, full_name, handle, avatar_path, verified_author_at)";

/** Published, visible articles, newest first. Search covers title, excerpt and author name. */
export async function listPublicArticles({ q, lang, topic, page = 1, authorId, excludeId, limit = PAGE_SIZE }: { q?: string; lang?: string; topic?: string; page?: number; authorId?: string; excludeId?: string; limit?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("articles")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .eq("moderation", "visible")
    .order("published_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (lang === "en" || lang === "hi") query = query.eq("language", lang);
  if (topic) query = query.eq("topic", topic);
  if (authorId) query = query.eq("author_id", authorId);
  if (excludeId) query = query.neq("id", excludeId);
  const term = (q ?? "").replace(/[%_,().*\\]/g, " ").trim().slice(0, 80);
  if (term) {
    const { data: authors } = await admin.from("profiles").select("id").ilike("full_name", `%${term}%`).limit(50);
    const ids = (authors ?? []).map((a) => a.id);
    query = query.or([`title.ilike.%${term}%`, `excerpt.ilike.%${term}%`, ...(ids.length ? [`author_id.in.(${ids.join(",")})`] : [])].join(","));
  }
  const { data, count } = await query;
  return { articles: (data ?? []) as unknown as ArticleCard[], total: count ?? 0 };
}

/** Visible comment, like and view counts for one article (always computed, so moderation and deletion keep them right). */
export async function articleCounts(articleId: string) {
  const admin = createAdminClient();
  const [likes, comments, views] = await Promise.all([
    admin.from("article_likes").select("*", { count: "exact", head: true }).eq("article_id", articleId),
    admin.from("article_comments").select("*", { count: "exact", head: true }).eq("article_id", articleId).eq("moderation", "visible"),
    admin.from("article_views").select("*", { count: "exact", head: true }).eq("article_id", articleId),
  ]);
  return { likes: likes.count ?? 0, comments: comments.count ?? 0, views: views.count ?? 0 };
}

/** One published, visible article by its short id, with its public author details. Drafts and hidden articles return null. */
export async function getPublicArticle(shortId: string) {
  const admin = createAdminClient();
  const { data: a } = await admin.from("articles").select("*").eq("short_id", shortId).eq("status", "published").eq("moderation", "visible").maybeSingle();
  if (!a) return null;
  const { data: author } = await admin.from("profiles").select("id, full_name, handle, bio, avatar_path").eq("id", a.author_id).maybeSingle();
  return { article: a, author: author ?? { id: a.author_id, full_name: null, handle: null, bio: null, avatar_path: null } };
}

/** The signed-in reader's own like/save/follow state, and anyone either side has blocked. */
export async function readerState(userId: string | null, articleId: string, authorId: string) {
  if (!userId) return { liked: false, saved: false, following: false, blockedIds: new Set<string>(), blockedWithAuthor: false, restricted: false };
  const admin = createAdminClient();
  const [liked, saved, following, blocks, restricted] = await Promise.all([
    admin.from("article_likes").select("user_id").eq("article_id", articleId).eq("user_id", userId).maybeSingle(),
    admin.from("article_bookmarks").select("user_id").eq("article_id", articleId).eq("user_id", userId).maybeSingle(),
    admin.from("follows").select("follower_id").eq("follower_id", userId).eq("author_id", authorId).maybeSingle(),
    admin.from("user_blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    isRestricted(userId),
  ]);
  const blockedIds = new Set((blocks.data ?? []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id)));
  return { liked: Boolean(liked.data), saved: Boolean(saved.data), following: Boolean(following.data), blockedIds, blockedWithAuthor: blockedIds.has(authorId), restricted };
}

/** Visible comments, oldest first, with commenters' display names only (never contact details). */
export async function publicComments(articleId: string, hideFrom: Set<string>) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("article_comments")
    .select("id, body, created_at, edited_at, user_id, who:profiles!article_comments_user_id_fkey(full_name, avatar_path)")
    .eq("article_id", articleId)
    .eq("moderation", "visible")
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? [])
    .filter((c) => !hideFrom.has(c.user_id))
    .map((c) => {
      const who = c.who as { full_name: string | null; avatar_path: string | null } | null;
      return { ...c, name: who?.full_name ?? "Reader", avatar: who?.avatar_path ?? null };
    });
}

/** A public author page: authors and admins with a handle (via the public_authors view's rules). */
export async function getPublicAuthor(handle: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(handle)) return null;
  const { data } = await createAdminClient().from("public_authors").select("id, handle, full_name, bio, avatar_path").eq("handle", handle).maybeSingle();
  return data?.id && data.handle ? (data as { id: string; handle: string; full_name: string | null; bio: string | null; avatar_path: string | null }) : null;
}
