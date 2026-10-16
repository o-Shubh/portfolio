"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { LIMITS, normalizeTags, parseArticle, publishProblems, slugify, TOPICS, wordCount, articlePath } from "@/lib/article-format";
import { COVER_BUCKET, ensureHandle, isRestricted, overLimit } from "@/lib/articles";
import type { Json } from "@/lib/database.types";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type ArticleInput = {
  title: string;
  excerpt: string;
  language: string;
  topic: string;
  tags: string;
  body_md: string;
  cover_alt: string;
  related_book_id: string;
  rights: boolean;
};
export type SaveResult = { ok: true; savedAt: string; path: string } | { error: string };

async function ownArticle(id: string) {
  const profile = await requireRole(["author", "admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { profile, article: null };
  const { data: article } = await createAdminClient().from("articles").select("*").eq("id", id).maybeSingle();
  return { profile, article: article && article.author_id === profile.id ? article : null };
}

const refresh = (a: { id: string; short_id: string; slug: string; author_id: string }) => {
  revalidatePath("/author/articles");
  revalidatePath(`/author/articles/${a.id}`);
  revalidatePath("/articles");
  revalidatePath(articlePath(a));
};

/** Starts an empty draft and opens the editor. Free and Pro authors alike. */
export async function createArticle(): Promise<{ error: string } | void> {
  const profile = await requireRole(["author", "admin"]);
  if (await isRestricted(profile.id)) return { error: "Your account can't post right now. Contact support if you think this is a mistake." };
  if (await overLimit("articles", "author_id", profile.id, 20, 86400)) return { error: "You've started 20 articles today. Try again tomorrow." };
  await ensureHandle(profile);
  const { data, error } = await createAdminClient().from("articles").insert({ author_id: profile.id }).select("id").single();
  if (error || !data) return { error: "Could not start an article. Please try again." };
  redirect(`/author/articles/${data.id}`);
}

/**
 * Saves the editor's fields (autosave and "Save draft"). Drafts can be incomplete; hard limits still apply.
 * A published article is updated only by an explicit save, never by autosave (the editor doesn't autosave it).
 */
export async function saveArticle(id: string, input: ArticleInput): Promise<SaveResult> {
  const { profile, article } = await ownArticle(id);
  if (!article) return { error: "Article not found." };
  if (article.moderation === "removed") return { error: "This article was removed by our team and can't be edited." };
  if (await isRestricted(profile.id)) return { error: "Your account can't post right now." };

  const title = String(input.title ?? "").trim();
  const excerpt = String(input.excerpt ?? "").trim();
  const body_md = String(input.body_md ?? "");
  const cover_alt = String(input.cover_alt ?? "").trim();
  if (title.length > LIMITS.title) return { error: `Keep the title under ${LIMITS.title} characters.` };
  if (excerpt.length > LIMITS.excerpt) return { error: `Keep the excerpt under ${LIMITS.excerpt} characters.` };
  if (body_md.length > LIMITS.body) return { error: `Articles can be up to ${LIMITS.body.toLocaleString("en-IN")} characters. Share an excerpt, not a whole manuscript.` };
  if (cover_alt.length > LIMITS.coverAlt) return { error: `Keep the image description under ${LIMITS.coverAlt} characters.` };
  const language = input.language === "hi" ? "hi" : "en";
  const topic = TOPICS.some((t) => t.value === input.topic) ? input.topic : null;
  const tags = normalizeTags(String(input.tags ?? ""));
  if ("error" in tags) return { error: tags.error };

  let related: string | null = null;
  if (input.related_book_id) {
    const { data: book } = await createAdminClient().from("books").select("id, author_id, status").eq("id", input.related_book_id).maybeSingle();
    if (!book || book.author_id !== profile.id || book.status !== "published") return { error: "Choose one of your own published books." };
    related = book.id;
  }

  const blocks = parseArticle(body_md);
  const contentChanged = title !== article.title || excerpt !== article.excerpt || body_md !== article.body_md;
  const now = new Date().toISOString();
  const patch = {
    title,
    excerpt,
    body_md,
    body: blocks as unknown as NonNullable<Json>,
    word_count: wordCount(blocks),
    slug: slugify(title),
    cover_alt: cover_alt || null,
    language,
    topic,
    tags,
    related_book_id: related,
    rights_confirmed_at: input.rights ? (article.rights_confirmed_at ?? now) : article.status === "draft" ? null : article.rights_confirmed_at,
    ...(article.status === "published" && contentChanged ? { content_updated_at: now } : {}),
  };
  if (article.status !== "draft" && !input.rights) return { error: "Keep the rights confirmation ticked for a published article." };
  const { data, error } = await createAdminClient().from("articles").update(patch).eq("id", id).select("id, short_id, slug, author_id, updated_at").single();
  if (error || !data) return { error: "Could not save. Your text is still here; try again." };
  refresh(data);
  return { ok: true, savedAt: data.updated_at, path: articlePath(data) };
}

/** Saves, checks everything needed, then publishes. Followers are notified on the first publication only. */
export async function publishArticle(id: string, input: ArticleInput): Promise<SaveResult & { notified?: number }> {
  const saved = await saveArticle(id, input);
  if ("error" in saved) return saved;
  const { profile, article } = await ownArticle(id);
  if (!article) return { error: "Article not found." };
  if (article.moderation !== "visible") return { error: "This article is hidden by our team. Contact support to discuss it." };
  const problems = publishProblems(article, Boolean(article.rights_confirmed_at));
  if (problems.length) return { error: problems.join(" ") };
  const { data, error } = await createAdminClient().rpc("publish_article", { p_article: id, p_author: profile.id });
  if (error) return { error: "Could not publish. Please try again." };
  const res = Array.isArray(data) ? data[0] : data;
  await logAudit(profile.id, res?.first_time ? "article.published" : "article.republished", "article", id, { notified: res?.notified ?? 0 });
  refresh(article);
  revalidatePath("/sitemap.xml");
  return { ...saved, notified: res?.notified ?? 0 };
}

/** Takes a published article off the site. It stays in My Articles; republishing doesn't notify followers again. */
export async function unpublishArticle(id: string): Promise<{ ok: true } | { error: string }> {
  const { profile, article } = await ownArticle(id);
  if (!article) return { error: "Article not found." };
  if (article.status !== "published") return { error: "This article isn't published." };
  await createAdminClient().from("articles").update({ status: "unpublished" }).eq("id", id);
  await logAudit(profile.id, "article.unpublished", "article", id);
  refresh(article);
  return { ok: true };
}

/** Deletes an article for good, with its cover image, likes, bookmarks and comments. */
export async function deleteArticle(id: string): Promise<{ error: string } | void> {
  const { profile, article } = await ownArticle(id);
  if (!article) return { error: "Article not found." };
  const admin = createAdminClient();
  if (article.cover_path) await admin.storage.from(COVER_BUCKET).remove([article.cover_path]);
  await admin.from("articles").delete().eq("id", id);
  await logAudit(profile.id, "article.deleted", "article", id, { title: article.title });
  refresh(article);
  redirect("/author/articles");
}
