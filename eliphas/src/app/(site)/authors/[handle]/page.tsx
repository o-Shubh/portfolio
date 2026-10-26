import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleGrid } from "@/components/ArticleCard";
import { VERIFIED_NOTE, VerifiedBadge } from "@/components/VerifiedBadge";
import { createAdminClient } from "@/lib/supabase/admin";
import { PostCard } from "@/components/community/PostCard";
import { listPosts } from "@/lib/posts";
import { FollowButton } from "@/components/articles/FollowButton";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { BookGrid, BookRow } from "@/components/BookCard";
import { ShareButton } from "@/components/ShareButton";
import { getPublicAuthor, listPublicArticles, PAGE_SIZE, readerState } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth";
import type { PublicBook } from "@/lib/books";
import { seesMature } from "@/lib/mature";
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
  const verified = Boolean((await createAdminClient().from("profiles").select("verified_author_at").eq("id", author.id).single()).data?.verified_author_at);

  const supabase = await createClient();
  const [me, booksRes, articles] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("books")
      .select("id, slug, title, subtitle, author_name, description, language, genre, isbn, page_count, trim_size, binding, interior, paper, cover_finish, mrp, cover_path, published_at, author_id, sample_path, sample_from, sample_to, eeid, edition_label, age_rating", { count: "exact" })
      .eq("status", "published")
      .in("age_rating", (await seesMature()) ? ["general", "mature"] : ["general"])
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

  const [first, ...rest] = books;
  const stats = [
    { label: "Books", value: booksRes.count ?? books.length },
    { label: "Articles", value: articles.total },
    { label: "Updates", value: updates.total },
  ];

  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/authors" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Authors
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">{name}</span>
      </nav>
      <header className="mt-2 rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0 [&_img]:h-24 [&_img]:w-24 [&>*]:h-24 [&>*]:w-24 [&>*]:text-2xl md:[&_img]:h-28 md:[&_img]:w-28 md:[&>*]:h-28 md:[&>*]:w-28">
            <AuthorAvatar name={author.full_name} path={author.avatar_path} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            {verified && (
              <div className="mb-2">
                <VerifiedBadge />
              </div>
            )}
            <h1 className="display text-[1.875rem] leading-tight md:text-[2.375rem]">{name}</h1>
            {author.bio && <p className="mt-2 max-w-2xl text-[1.0625rem] leading-relaxed whitespace-pre-line text-fg/90">{author.bio}</p>}
            {verified && <p className="mt-2 max-w-2xl text-xs text-muted">{VERIFIED_NOTE}</p>}
            <dl className="mt-4 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-control)] bg-line ring-1 ring-line">
              {stats.map((st) => (
                <div key={st.label} className="bg-surface-2 px-3 py-2.5">
                  <dt className="text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase">{st.label}</dt>
                  <dd className="mono mt-0.5 text-lg font-medium">{st.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {me?.id !== author.id && !state.blockedWithAuthor && <FollowButton authorId={author.id} authorName={name} following={state.following} intent={intent} />}
              <ShareButton path={`/authors/${author.handle}`} title={name} label="Share profile" />
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Author sections" className="no-scrollbar mt-6 overflow-x-auto">
        <div className="segmented">
          {tabs.map((t) => (
            <Link key={t.key} href={t.href} aria-current={tab === t.key ? "page" : undefined} className="segment px-4 whitespace-nowrap">
              {t.label} <span className="mono text-xs text-muted">{t.count}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        {tab === "books" ? (
          first ? (
            <div className="space-y-6">
              <div className="max-w-3xl">
                <h2 className="mb-2 text-xs font-semibold tracking-[0.06em] text-muted uppercase">Latest book</h2>
                <BookRow book={first} verified={verified} priority />
              </div>
              {rest.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg">All books</h2>
                  <BookGrid books={rest} />
                </section>
              )}
            </div>
          ) : (
            <p className="rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">No published books yet.</p>
          )
        ) : tab === "updates" ? (
          updates.posts.length ? (
            <div className="mx-auto max-w-2xl space-y-4">
              {updates.posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">No updates yet.</p>
          )
        ) : articles.articles.length ? (
          <ArticleGrid articles={articles.articles} showAuthor={false} />
        ) : (
          <p className="rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">No articles yet.</p>
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
