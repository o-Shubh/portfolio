import type { Metadata } from "next";
import Link from "next/link";
import { articleDate } from "@/components/ArticleCard";
import { RemoveSaved } from "@/components/articles/AccountControls";
import { BookCover } from "@/components/BookCover";
import { PageHeader } from "@/components/PageHeader";
import { SaveBookButton } from "@/components/SaveBookButton";
import { coverUrl } from "@/lib/books";
import { rupees } from "@/lib/pricing";
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
  const t = (await searchParams).tab;
  const tab = t === "posts" ? "posts" : t === "books" ? "books" : "articles";
  const { data: books } =
    tab === "books"
      ? await createAdminClient()
          .from("wishlist")
          .select("created_at, price_at_save, book:books(id, slug, title, author_name, mrp, cover_path, status)")
          .eq("user_id", me.id)
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] };
  const posts = tab === "posts" ? await savedPosts(me.id) : [];
  const { data } =
    tab !== "articles"
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
        {(["books", "articles", "posts"] as const).map((t) => (
          <Link
            key={t}
            href={t === "articles" ? "/account/saved" : `/account/saved?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className="segment px-4"
          >
            {t === "posts" ? "Community posts" : t === "books" ? "Books" : "Articles"}
          </Link>
        ))}
      </nav>
      {tab === "books" ? (
        !books?.length ? (
          <div className="card max-w-3xl text-center">
            <p className="font-semibold">No saved books</p>
            <p className="mt-1 text-sm text-muted">Tap Save for later on a book. We&apos;ll tell you if its price drops.</p>
            <Link href="/books" className="btn-primary mt-4">
              Browse books
            </Link>
          </div>
        ) : (
          <ul className="group-list max-w-3xl">
            {books.map(({ book: b, created_at, price_at_save }) => {
              if (!b) return null;
              const live = b.status === "published";
              const drop = live && b.mrp !== null && price_at_save !== null ? Number(price_at_save) - Number(b.mrp) : 0;
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-4 px-4 py-4 md:px-5" data-testid="saved-book">
                  <div className="w-14 shrink-0">
                    <BookCover title={b.title} author={b.author_name} slug={b.slug} src={coverUrl(b.cover_path)} size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {live ? (
                      <Link href={`/books/${b.slug}`} className="font-semibold hover:underline hover:underline-offset-2">
                        {b.title}
                      </Link>
                    ) : (
                      <p className="font-semibold">{b.title}</p>
                    )}
                    <p className="text-sm text-muted">{b.author_name}</p>
                    {live ? (
                      <p className="mt-1 text-sm">
                        <span className="mono font-medium">{rupees(Number(b.mrp))}</span>
                        {drop > 0 && <span className="ml-2 font-medium text-success">{rupees(drop)} less than when you saved it</span>}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Not on sale right now. We&apos;ll tell you when it&apos;s back.</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">Saved {articleDate(created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {live && (
                      <Link href={`/checkout/${b.slug}`} className="btn-accent min-h-11 px-4 text-sm">
                        Buy now
                      </Link>
                    )}
                    <SaveBookButton bookId={b.id} slug={b.slug} saved loggedIn />
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : tab === "posts" ? (
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
