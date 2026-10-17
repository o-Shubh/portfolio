"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { blockedBetween, ensureHandle, isRestricted, overLimit } from "@/lib/articles";
import { logAudit } from "@/lib/plans";
import { POST_BUCKET, POST_LIMIT } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";

export type PostState = { error?: string; ok?: string } | undefined;
type Result = { ok: true; on?: boolean } | { error: string; login?: boolean; onboarding?: boolean };
const LOGIN = { error: "Log in to continue.", login: true } as const;
const ONBOARD = { error: "Finish setting up your account first.", onboarding: true } as const;
const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

async function ownPost(id: string) {
  const me = await requireRole(["author", "admin"]);
  if (!isId(id)) return { me, post: null };
  const { data: post } = await createAdminClient().from("posts").select("*").eq("id", id).maybeSingle();
  return { me, post: post && post.author_id === me.id ? post : null };
}

const refresh = (id?: string) => {
  revalidatePath("/community");
  revalidatePath("/author/community");
  if (id) {
    revalidatePath(`/community/${id}`);
    revalidatePath(`/author/community/${id}`);
  }
};

/** Starts an empty draft update and opens the editor. */
export async function createPost(): Promise<{ error: string } | void> {
  const me = await requireRole(["author", "admin"]);
  if (await isRestricted(me.id)) return { error: "Your account can't post right now." };
  if (await overLimit("posts", "author_id", me.id, 20, 86400)) return { error: "You've started 20 updates today. Try again tomorrow." };
  await ensureHandle(me);
  const { data, error } = await createAdminClient().from("posts").insert({ author_id: me.id }).select("id").single();
  if (error || !data) return { error: "Could not start an update. Please try again." };
  redirect(`/author/community/${data.id}`);
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
  if (body.length > POST_LIMIT) return { error: `Keep updates under ${POST_LIMIT.toLocaleString("en-IN")} characters. Longer pieces work better as an article.` };
  if (alt.length > 200) return { error: "Keep the image description under 200 characters." };
  let related: string | null = null;
  if (bookId) {
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
  redirect("/author/community");
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
  if (!p) return { error: "This update isn't available." };
  const admin = createAdminClient();
  if (on) await admin.from("post_likes").upsert({ post_id: p.id, user_id: me.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
  else await admin.from("post_likes").delete().eq("post_id", p.id).eq("user_id", me.id);
  revalidatePath(`/community/${p.id}`);
  return { ok: true, on };
}

export async function addPostComment(postId: string, body: string): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const text = String(body ?? "").trim();
  if (!text) return { error: "Write a comment first." };
  if (text.length > 1000) return { error: "Keep comments under 1,000 characters." };
  const p = await publicPost(postId);
  if (!p) return { error: "This update isn't available." };
  if (await isRestricted(me.id)) return { error: "Your account can't comment right now." };
  if (await blockedBetween(me.id, p.author_id)) return { error: "You can't comment on this update." };
  if ((await overLimit("post_comments", "user_id", me.id, 5, 60)) || (await overLimit("post_comments", "user_id", me.id, 60, 86400))) {
    return { error: "You're commenting very quickly. Please wait a little and try again." };
  }
  await createAdminClient().from("post_comments").insert({ post_id: p.id, user_id: me.id, body: text });
  revalidatePath(`/community/${p.id}`);
  return { ok: true };
}

export async function editPostComment(commentId: string, body: string): Promise<Result> {
  const me = await member();
  if ("error" in me) return me;
  const text = String(body ?? "").trim();
  if (!text || text.length > 1000) return { error: "Comments must be 1–1,000 characters." };
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
