import type { Metadata } from "next";
import Link from "next/link";
import { articleDate } from "@/components/ArticleCard";
import { RemoveSaved } from "@/components/articles/AccountControls";
import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/community/PostCard";
import { articlePath, readingMinutes } from "@/lib/article-format";
import { requireRole } from "@/lib/auth";
import { savedPosts } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

type Row = {
  created_at: string;
  article: {
    id: string;
    short_id: string;
    slug: string;
    title: string;
    excerpt: string;
    status: string;
    moderation: string;
    published_at: string | null;
    word_count: number;
    author: { full_name: string | null } | null;
  } | null;
};

export default async function SavedPage({ searchParams }: PageProps<"/account/saved">) {
  const me = await requireRole(["reader", "author", "printer", "admin"]);
  const tab = (await searchParams).tab === "posts" ? "posts" : "articles";
  const posts = tab === "posts" ? await savedPosts(me.id) : [];
  const { data } =
    tab === "posts"
      ? { data: [] }
      : await createAdminClient()
          .from("article_bookmarks")
          .select(
            "created_at, article:articles(id, short_id, slug, title, excerpt, status, moderation, published_at, word_count, author:profiles!articles_author_id_fkey(full_name))",
          )
          .eq("user_id", me.id)
          .order("created_at", { ascending: false })
          .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Saved" intro="Only you can see what you've saved. Nobody is told." />
      <nav aria-label="Saved items" className="segmented mb-5">
        {(["articles", "posts"] as const).map((t) => (
          <Link
            key={t}
            href={t === "posts" ? "/account/saved?tab=posts" : "/account/saved"}
            aria-current={tab === t ? "page" : undefined}
            className="segment px-4"
          >
            {t === "posts" ? "Community posts" : "Articles"}
          </Link>
        ))}
      </nav>
      {tab === "posts" ? (
        posts.length === 0 ? (
          <div className="card max-w-3xl text-center">
            <p className="font-semibold">No saved posts</p>
            <p className="mt-1 text-sm text-muted">Tap Save on a Community post to keep it here.</p>
            <Link href="/community" className="btn-primary mt-4">
              Go to Community
            </Link>
          </div>
        ) : (
          <ul className="max-w-3xl space-y-3">
            {posts.map((p) => (
              <li key={p.id} data-testid="saved-post">
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <div className="card max-w-3xl text-center">
          <p className="font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted">Tap Save on any article to read it later.</p>
          <Link href="/articles" className="btn-primary mt-4">
            Browse articles
          </Link>
        </div>
      ) : (
        <ul className="group-list max-w-3xl">
          {rows.map(({ article: a, created_at }) =>
            a ? (
              <li key={a.id} className="flex flex-wrap items-start gap-3 px-4 py-4 md:px-5" data-testid="saved-article">
                <div className="min-w-0 flex-1">
                  {a.status === "published" && a.moderation === "visible" ? (
                    <>
                      <Link href={articlePath(a)} className="text-lg font-semibold hover:underline hover:underline-offset-2">
                        {a.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{a.excerpt}</p>
                      <p className="mt-1 text-xs text-muted">
                        {a.author?.full_name} · {articleDate(a.published_at)} · {readingMinutes(a.word_count)} min read
                      </p>
                    </>
                  ) : (
                    <p className="text-muted">This article is no longer available.</p>
                  )}
                  <p className="mt-1 text-xs text-muted">Saved {articleDate(created_at)}</p>
                </div>
                <RemoveSaved articleId={a.id} />
              </li>
            ) : null,
          )}
        </ul>
      )}
    </>
  );
}
