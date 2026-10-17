import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleGrid } from "@/components/ArticleCard";
import { PostCard } from "@/components/community/PostCard";
import { listPosts } from "@/lib/posts";
import { FollowButton } from "@/components/articles/FollowButton";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { BookGrid } from "@/components/BookCard";
import { getPublicAuthor, listPublicArticles, PAGE_SIZE, readerState } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth";
import type { PublicBook } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/authors/[handle]">): Promise<Metadata> {
  const author = await getPublicAuthor((await params).handle);
  if (!author) return { title: "Author not found", robots: { index: false } };
  const name = author.full_name ?? "Author";
  return {
    title: `${name}: books and articles`,
    description: author.bio?.slice(0, 200) ?? `Books and articles by ${name} on Eliphas Indicus Publications.`,
    alternates: { canonical: `/authors/${author.handle}` },
    openGraph: { type: "profile", title: name, description: author.bio ?? undefined },
  };
}

export default async function AuthorPage({ params, searchParams }: PageProps<"/authors/[handle]">) {
  const { handle } = await params;
  const sp = await searchParams;
  const author = await getPublicAuthor(handle);
  if (!author) notFound();
  const tab = sp.tab === "articles" ? "articles" : sp.tab === "updates" ? "updates" : "books";
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const name = author.full_name ?? "Author";

  const supabase = await createClient();
  const [me, booksRes, articles] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("books")
      .select("id, slug, title, subtitle, author_name, description, language, genre, isbn, page_count, trim_size, binding, interior, paper, cover_finish, mrp, cover_path, published_at, author_id", { count: "exact" })
      .eq("status", "published")
      .eq("author_id", author.id)
      .order("published_at", { ascending: false })
      .limit(48),
    listPublicArticles({ authorId: author.id, page: tab === "articles" ? page : 1 }),
  ]);
  const books = (booksRes.data ?? []) as PublicBook[];
  const [state, updates] = await Promise.all([
    readerState(me?.id ?? null, "00000000-0000-0000-0000-000000000000", author.id),
    listPosts({ authorId: author.id, userId: me?.id ?? null, page: tab === "updates" ? page : 1 }),
  ]);
  const pages = Math.max(1, Math.ceil(articles.total / PAGE_SIZE));
  const intent = typeof sp.intent === "string" ? sp.intent : null;

  const tabs = [
    { key: "books", label: "Books", count: booksRes.count ?? books.length, href: `/authors/${author.handle}` },
    { key: "articles", label: "Articles", count: articles.total, href: `/authors/${author.handle}?tab=articles` },
    { key: "updates", label: "Updates", count: updates.total, href: `/authors/${author.handle}?tab=updates` },
  ];

  return (
    <div className="container-x py-5 md:py-8">
      <header className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-line md:p-6">
        <AuthorAvatar name={author.full_name} path={author.avatar_path} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Author</p>
          <h1 className="mt-1 text-2xl md:text-3xl">{name}</h1>
          {author.bio && <p className="mt-2 max-w-2xl whitespace-pre-line text-fg/90">{author.bio}</p>}
        </div>
        {me?.id !== author.id && !state.blockedWithAuthor && <FollowButton authorId={author.id} authorName={name} following={state.following} intent={intent} />}
      </header>

      <nav aria-label="Author sections" className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium ${tab === t.key ? "border-gold text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t.label} <span className="tabular-nums text-muted">{t.count}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "books" ? (
          books.length ? (
            <BookGrid books={books} />
          ) : (
            <p className="rounded-xl bg-surface px-6 py-12 text-center text-muted shadow-soft ring-1 ring-line">No published books yet.</p>
          )
        ) : tab === "updates" ? (
          updates.posts.length ? (
            <div className="mx-auto max-w-2xl space-y-4">
              {updates.posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-surface px-6 py-12 text-center text-muted shadow-soft ring-1 ring-line">No updates yet.</p>
          )
        ) : articles.articles.length ? (
          <ArticleGrid articles={articles.articles} showAuthor={false} />
        ) : (
          <p className="rounded-xl bg-surface px-6 py-12 text-center text-muted shadow-soft ring-1 ring-line">No articles yet.</p>
        )}
      </div>

      {tab === "articles" && pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={`/authors/${author.handle}?tab=articles&page=${page - 1}`}>
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={`/authors/${author.handle}?tab=articles&page=${page + 1}`}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
