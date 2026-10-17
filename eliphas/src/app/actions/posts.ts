"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { blockedBetween, ensureHandle, isRestricted, overLimit } from "@/lib/articles";
import { logAudit } from "@/lib/plans";
import { notify } from "@/lib/notify";
import { POST_BUCKET, POST_LIMIT } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";

export type PostState = { error?: string; ok?: string } | undefined;
type Result = { ok: true; on?: boolean } | { error: string; login?: boolean; onboarding?: boolean };
const LOGIN = { error: "Log in to continue.", login: true } as const;
const ONBOARD = { error: "Finish setting up your account first.", onboarding: true } as const;
const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** Any signed-up member (reader or author) can post; ownership is checked on every change. */
async function requireMember() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/community");
  if (!me.full_name) redirect("/onboarding?next=/community");
  return me;
}

async function ownPost(id: string) {
  const me = await requireMember();
  if (!isId(id)) return { me, post: null };
  const { data: post } = await createAdminClient().from("posts").select("*").eq("id", id).maybeSingle();
  return { me, post: post && post.author_id === me.id ? post : null };
}

const refresh = (id?: string) => {
  revalidatePath("/community");
  revalidatePath("/author/community");
  if (id) {
    revalidatePath(`/community/${id}`);
    revalidatePath(`/community/${id}/edit`);
  }
};

/** Starts an empty draft update and opens the editor. */
export async function createPost(): Promise<{ error: string } | void> {
  const me = await requireMember();
  if (await isRestricted(me.id)) return { error: "Your account can't post right now." };
  if (await overLimit("posts", "author_id", me.id, 20, 86400)) return { error: "You've started 20 posts today. Try again tomorrow." };
  await ensureHandle(me);
  const { data, error } = await createAdminClient().from("posts").insert({ author_id: me.id }).select("id").single();
  if (error || !data) return { error: "Could not start a post. Please try again." };
  redirect(`/community/${data.id}/edit`);
}

/** Saves the text, image description and related book. Publishing is a separate, explicit step. */
export async function savePost(id: string, _prev: PostState, fd: FormData): Promise<PostState> {
  const { me, post } = await ownPost(id);
  if (!post) return { error: "Update not found." };
  if (post.moderation === "removed") return { error: "This update was removed by our team and can't be edited." };
  if (await isRestricted(me.id)) return { error: "Your account can't post right now." };
  const body = String(fd.get("body") ?? "").trim();
  const alt = String(fd.get("image_alt") ?? "").trim();
  const bookId = String(fd.get("related_book_id") ?? "");
  if (body.length > POST_LIMIT) return { error: `Keep posts under ${POST_LIMIT.toLocaleString("en-IN")} characters. Longer pieces work better as an article.` };
  if (alt.length > 200) return { error: "Keep the image description under 200 characters." };
  let related: string | null = null;
  if (bookId) {
    if (!me.verified_author_at) return { error: "Only verified authors can link a book to a post." };
    const { data: book } = await createAdminClient().from("books").select("id, author_id, status").eq("id", bookId).maybeSingle();
    if (!book || book.author_id !== me.id || book.status !== "published") return { error: "Choose one of your own published books." };
    related = book.id;
  }
  const publish = fd.get("intent") === "publish";
  if (publish) {
    if (!body) return { error: "Write something before publishing." };
    if (post.image_path && !alt) return { error: "Describe the image for readers using screen readers." };
  }
  const changed = body !== post.body;
  const { error } = await createAdminClient()
    .from("posts")
    .update({ body, image_alt: alt || null, related_book_id: related, ...(post.status === "published" && changed ? { edited_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) return { error: "Could not save. Your text is still here; try again." };

  if (publish && post.status !== "published") {
    if (post.moderation !== "visible") return { error: "This update is hidden by our team." };
    const { data, error: pubErr } = await createAdminClient().rpc("publish_post", { p_post: id, p_author: me.id });
    if (pubErr) return { error: "Could not publish. Please try again." };
    const res = Array.isArray(data) ? data[0] : data;
    await logAudit(me.id, "post.published", "post", id, { notified: res?.notified ?? 0 });
    refresh(id);
    return { ok: res?.notified ? `Published. ${res.notified} follower${res.notified === 1 ? "" : "s"} notified.` : "Published." };
  }
  refresh(id);
  return { ok: post.status === "published" ? "Update saved." : "Draft saved." };
}

/** Back to draft: hidden from feeds; publishing again doesn't notify followers again. */
export async function unpublishPost(id: string): Promise<PostState> {
  const { me, post } = await ownPost(id);
  if (!post) return { error: "Update not found." };
  await createAdminClient().from("posts").update({ status: "draft" }).eq("id", id);
  await logAudit(me.id, "post.unpublished", "post", id);
  refresh(id);
  return { ok: "Moved back to drafts." };
}

export async function deletePost(id: string): Promise<{ error: string } | void> {
  const { me, post } = await ownPost(id);
  if (!post) return { error: "Update not found." };
  const admin = createAdminClient();
  if (post.image_path) await admin.storage.from(POST_BUCKET).remove([post.image_path]);
  await admin.from("posts").delete().eq("id", id);
  await logAudit(me.id, "post.deleted", "post", id);
  refresh(id);
  redirect(me.role === "author" || me.role === "admin" ? "/author/community" : "/community");
}

async function member() {
  const me = await getCurrentProfile();
  if (!me) return LOGIN;
  if (!me.full_name) return ONBOARD;
  return me;
}

async function publicPost(id: string) {
  if (!isId(id)) return null;
  const { data } = await createAdminClient().from("posts").select("id, author_id, status, moderation").eq("id", id).maybeSingle();
  return data && data.status === "published" && data.moderation === "visible" ? data : null;
}

/** One like per account (the database refuses duplicates). */
export async function setPostLike(postId: string, on: boolean): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const p = await publicPost(postId);
  if (!p) return { error: "This post isn't available." };
  const admin = createAdminClient();
  if (on) await admin.from("post_likes").upsert({ post_id: p.id, user_id: me.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
  else await admin.from("post_likes").delete().eq("post_id", p.id).eq("user_id", me.id);
  revalidatePath(`/community/${p.id}`);
  return { ok: true, on };
}

/** A comment, or a reply to a comment (two levels only). Notifies the post's author and, for replies, the comment's author. */
export async function addPostComment(postId: string, body: string, parentId: string | null = null): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const text = String(body ?? "").trim();
  if (!text) return { error: "Write a comment first." };
  if (text.length > 2000) return { error: "Keep comments under 2,000 characters." };
  const p = await publicPost(postId);
  if (!p) return { error: "This post isn't available." };
  if (await isRestricted(me.id)) return { error: "Your account can't comment right now." };
  if (await blockedBetween(me.id, p.author_id)) return { error: "You can't comment on this post." };
  if ((await overLimit("post_comments", "user_id", me.id, 5, 60)) || (await overLimit("post_comments", "user_id", me.id, 60, 86400))) {
    return { error: "You're commenting very quickly. Please wait a little and try again." };
  }
  const admin = createAdminClient();
  let parent: { id: string; user_id: string } | null = null;
  if (parentId) {
    if (!isId(parentId)) return { error: "Comment not found." };
    const { data } = await admin.from("post_comments").select("id, user_id, post_id, parent_id, moderation").eq("id", parentId).maybeSingle();
    if (!data || data.post_id !== p.id || data.moderation !== "visible") return { error: "That comment isn't available." };
    if (data.parent_id) return { error: "You can reply to comments, not to replies." };
    if (await blockedBetween(me.id, data.user_id)) return { error: "You can't reply to this comment." };
    parent = data;
  }
  const { data: c, error } = await admin.from("post_comments").insert({ post_id: p.id, user_id: me.id, body: text, parent_id: parent?.id ?? null }).select("id").single();
  if (error || !c) return { error: "Could not post your comment. Please try again." };
  const link = `/community/${p.id}#c-${parent?.id ?? c.id}`;
  await notify({ userId: p.author_id, kind: "reply", actorId: me.id, refId: c.id, title: `${me.full_name} commented on your post`, link });
  if (parent && parent.user_id !== p.author_id) await notify({ userId: parent.user_id, kind: "reply", actorId: me.id, refId: c.id, title: `${me.full_name} replied to your comment`, link });
  revalidatePath(`/community/${p.id}`);
  return { ok: true };
}

/** Private bookmark ("Saved"). Nobody else can see who saved a post. */
export async function setPostBookmark(postId: string, on: boolean): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const admin = createAdminClient();
  if (on) {
    const p = await publicPost(postId);
    if (!p) return { error: "This post isn't available." };
    await admin.from("post_bookmarks").upsert({ post_id: p.id, user_id: me.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
  } else {
    await admin.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", me.id);
  }
  revalidatePath("/account/saved");
  return { ok: true, on };
}

/**
 * The composer on the Community page: creates a post and publishes it (or keeps it as a draft when an image
 * still has to be uploaded). Readers and authors alike; only verified authors may link a book.
 */
export async function composePost(input: { body: string; relatedBookId?: string; publish: boolean }): Promise<{ ok: true; id: string; notified?: number } | { error: string; login?: boolean; onboarding?: boolean }> {
  const me = await member();
  if ("error" in me) return me;
  const body = String(input.body ?? "").trim();
  if (!body) return { error: "Write something first." };
  if (body.length > POST_LIMIT) return { error: `Keep posts under ${POST_LIMIT.toLocaleString("en-IN")} characters.` };
  if (await isRestricted(me.id)) return { error: "Your account can't post right now." };
  if (await overLimit("posts", "author_id", me.id, 20, 86400)) return { error: "You've posted 20 times today. Try again tomorrow." };
  let related: string | null = null;
  if (input.relatedBookId) {
    if (!me.verified_author_at) return { error: "Only verified authors can link a book to a post." };
    const { data: book } = await createAdminClient().from("books").select("id, author_id, status").eq("id", input.relatedBookId).maybeSingle();
    if (!book || book.author_id !== me.id || book.status !== "published") return { error: "Choose one of your own published books." };
    related = book.id;
  }
  await ensureHandle(me);
  const admin = createAdminClient();
  const { data, error } = await admin.from("posts").insert({ author_id: me.id, body, related_book_id: related }).select("id").single();
  if (error || !data) return { error: "Could not post. Your text is still here; try again." };
  if (!input.publish) return { ok: true, id: data.id };
  return publishNow(data.id, me.id);
}

/** Publishes a draft the composer created (after its image upload), checking the image has a description. */
export async function publishComposed(id: string, imageAlt: string): Promise<{ ok: true; id: string; notified?: number } | { error: string }> {
  const { me, post } = await ownPost(id);
  if (!post) return { error: "Post not found." };
  const alt = String(imageAlt ?? "").trim().slice(0, 200);
  if (post.image_path && !alt) return { error: "Describe the image for readers using screen readers." };
  await createAdminClient().from("posts").update({ image_alt: alt || null }).eq("id", id);
  return publishNow(id, me.id);
}

async function publishNow(id: string, authorId: string): Promise<{ ok: true; id: string; notified?: number } | { error: string }> {
  const { data, error } = await createAdminClient().rpc("publish_post", { p_post: id, p_author: authorId });
  if (error) return { error: "Could not publish. Please try again." };
  const res = Array.isArray(data) ? data[0] : data;
  await logAudit(authorId, "post.published", "post", id, { notified: res?.notified ?? 0 });
  refresh(id);
  return { ok: true, id, notified: res?.notified ?? 0 };
}

export async function editPostComment(commentId: string, body: string): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const text = String(body ?? "").trim();
  if (!text || text.length > 2000) return { error: "Comments must be 1–2,000 characters." };
  const admin = createAdminClient();
  const { data: c } = await admin.from("post_comments").select("id, user_id, post_id, moderation").eq("id", commentId).maybeSingle();
  if (!c || c.user_id !== me.id || c.moderation !== "visible") return { error: "Comment not found." };
  await admin.from("post_comments").update({ body: text, edited_at: new Date().toISOString() }).eq("id", c.id);
  revalidatePath(`/community/${c.post_id}`);
  return { ok: true };
}

export async function deletePostComment(commentId: string): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const admin = createAdminClient();
  const { data: c } = await admin.from("post_comments").select("id, user_id, post_id").eq("id", commentId).maybeSingle();
  if (!c || c.user_id !== me.id) return { error: "Comment not found." };
  await admin.from("post_comments").delete().eq("id", c.id);
  revalidatePath(`/community/${c.post_id}`);
  return { ok: true };
}

export async function setPostNotifications(on: boolean): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  await createAdminClient().from("profiles").update({ notify_new_posts: on }).eq("id", me.id);
  revalidatePath("/account/notifications");
  return { ok: true, on };
}
