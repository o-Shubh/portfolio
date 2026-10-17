"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { articlePath } from "@/lib/article-format";
import { blockedBetween, isRestricted, overLimit } from "@/lib/articles";
import { createAdminClient } from "@/lib/supabase/admin";

export type CommunityResult = { ok: true; on?: boolean } | { error: string; login?: boolean; onboarding?: boolean };
const LOGIN = { error: "Log in to continue.", login: true } as const;
const ONBOARD = { error: "Finish setting up your account first.", onboarding: true } as const;

/** A published, visible article (anything else behaves as if it doesn't exist). */
async function publicArticle(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient()
    .from("articles")
    .select("id, short_id, slug, author_id, status, moderation")
    .eq("id", id)
    .maybeSingle();
  return data && data.status === "published" && data.moderation === "visible" ? data : null;
}

/** Like or unlike; one like per account per article (the database refuses duplicates). */
export async function setLike(articleId: string, on: boolean): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  const a = await publicArticle(articleId);
  if (!a) return { error: "This article isn't available." };
  const admin = createAdminClient();
  if (on) await admin.from("article_likes").upsert({ article_id: a.id, user_id: me.id }, { onConflict: "article_id,user_id", ignoreDuplicates: true });
  else await admin.from("article_likes").delete().eq("article_id", a.id).eq("user_id", me.id);
  revalidatePath(articlePath(a));
  return { ok: true, on };
}

/** Private bookmark ("Saved articles"). Authors never see who saved their articles. */
export async function setBookmark(articleId: string, on: boolean): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  const admin = createAdminClient();
  if (on) {
    const a = await publicArticle(articleId);
    if (!a) return { error: "This article isn't available." };
    await admin.from("article_bookmarks").upsert({ article_id: a.id, user_id: me.id }, { onConflict: "article_id,user_id", ignoreDuplicates: true });
  } else {
    await admin.from("article_bookmarks").delete().eq("article_id", articleId).eq("user_id", me.id);
  }
  revalidatePath("/account/saved");
  return { ok: true, on };
}

/** Follow an author: you get an in-app notification when they publish a new article. */
export async function setFollow(authorId: string, on: boolean): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  if (me.id === authorId) return { error: "You can't follow yourself." };
  const admin = createAdminClient();
  if (on) {
    const { data: author } = await admin.from("profiles").select("id, role").eq("id", authorId).maybeSingle();
    if (!author || !["author", "admin"].includes(author.role)) return { error: "Author not found." };
    if (await blockedBetween(me.id, authorId)) return { error: "You can't follow this author." };
    await admin.from("follows").upsert({ follower_id: me.id, author_id: authorId }, { onConflict: "follower_id,author_id", ignoreDuplicates: true });
  } else {
    await admin.from("follows").delete().eq("follower_id", me.id).eq("author_id", authorId);
  }
  return { ok: true, on };
}

/** A flat comment. Restricted accounts, people the author blocked, and rapid posting are refused. */
export async function addComment(articleId: string, body: string): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  const text = String(body ?? "").trim();
  if (!text) return { error: "Write a comment first." };
  if (text.length > 2000) return { error: "Keep comments under 2,000 characters." };
  const a = await publicArticle(articleId);
  if (!a) return { error: "This article isn't available." };
  if (await isRestricted(me.id)) return { error: "Your account can't comment right now." };
  if (await blockedBetween(me.id, a.author_id)) return { error: "You can't comment on this article." };
  if ((await overLimit("article_comments", "user_id", me.id, 5, 60)) || (await overLimit("article_comments", "user_id", me.id, 60, 86400))) {
    return { error: "You're commenting very quickly. Please wait a little and try again." };
  }
  await createAdminClient().from("article_comments").insert({ article_id: a.id, user_id: me.id, body: text });
  revalidatePath(articlePath(a));
  return { ok: true };
}

export async function editComment(commentId: string, body: string): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  const text = String(body ?? "").trim();
  if (!text || text.length > 2000) return { error: "Comments must be 1–2,000 characters." };
  const admin = createAdminClient();
  const { data: c } = await admin.from("article_comments").select("id, user_id, moderation, article_id").eq("id", commentId).maybeSingle();
  if (!c || c.user_id !== me.id || c.moderation !== "visible") return { error: "Comment not found." };
  if (await isRestricted(me.id)) return { error: "Your account can't comment right now." };
  await admin.from("article_comments").update({ body: text, edited_at: new Date().toISOString() }).eq("id", c.id);
  const a = await publicArticle(c.article_id);
  if (a) revalidatePath(articlePath(a));
  return { ok: true };
}

/** Deletes your own comment for good (counts update automatically). */
export async function deleteComment(commentId: string): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  const admin = createAdminClient();
  const { data: c } = await admin.from("article_comments").select("id, user_id, article_id").eq("id", commentId).maybeSingle();
  if (!c || c.user_id !== me.id) return { error: "Comment not found." };
  await admin.from("article_comments").delete().eq("id", c.id);
  const a = await publicArticle(c.article_id);
  if (a) revalidatePath(articlePath(a));
  return { ok: true };
}

const REASONS = ["spam", "abuse", "hate", "copyright", "private-info", "other"] as const;

/** Report an article or comment to our team. One open report per person per item. */
export async function reportContent(targetType: "article" | "comment" | "post" | "post_comment" | "review", targetId: string, reason: string, details: string): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  if (!REASONS.includes(reason as (typeof REASONS)[number])) return { error: "Choose a reason." };
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) return { error: "Not found." };
  if (await overLimit("content_reports", "reporter_id", me.id, 10, 86400)) return { error: "You've sent a lot of reports today. Our team will review them." };
  const admin = createAdminClient();
  const visible = async (table: "article_comments" | "post_comments" | "book_reviews" | "posts") =>
    Boolean((await admin.from(table).select("id").eq("id", targetId).eq("moderation", "visible").maybeSingle()).data);
  const exists =
    targetType === "article" ? Boolean(await publicArticle(targetId))
    : targetType === "comment" ? await visible("article_comments")
    : targetType === "post" ? await visible("posts")
    : targetType === "post_comment" ? await visible("post_comments")
    : targetType === "review" ? await visible("book_reviews")
    : false;
  if (!exists) return { error: "This item isn't available." };
  const { error } = await admin
    .from("content_reports")
    .insert({ reporter_id: me.id, target_type: targetType, target_id: targetId, reason, details: String(details ?? "").trim().slice(0, 1000) || null });
  if (error && !error.message.includes("duplicate")) return { error: "Could not send the report. Try again." };
  revalidatePath("/admin/moderation");
  return { ok: true };
}

/** Block someone: they can't comment on your articles or follow you, and you won't see their comments. */
export async function setBlock(userId: string, on: boolean): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  if (me.id === userId || !/^[0-9a-f-]{36}$/i.test(userId)) return { error: "You can't block this account." };
  const admin = createAdminClient();
  if (on) {
    await admin.from("user_blocks").upsert({ blocker_id: me.id, blocked_id: userId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
    await admin.from("follows").delete().or(`and(follower_id.eq.${me.id},author_id.eq.${userId}),and(follower_id.eq.${userId},author_id.eq.${me.id})`);
  } else {
    await admin.from("user_blocks").delete().eq("blocker_id", me.id).eq("blocked_id", userId);
  }
  return { ok: true, on };
}

export async function setArticleNotifications(on: boolean): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  await createAdminClient().from("profiles").update({ notify_new_articles: on }).eq("id", me.id);
  revalidatePath("/account/notifications");
  return { ok: true, on };
}

export async function markNotificationsRead(): Promise<CommunityResult> {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  await createAdminClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null);
  revalidatePath("/", "layout");
  return { ok: true };
}
