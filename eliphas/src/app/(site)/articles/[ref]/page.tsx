/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage */
import { BookOpen, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticleCard, articleDate } from "@/components/ArticleCard";
import { ArticleBody } from "@/components/ArticleBody";
import { ArticleActions } from "@/components/articles/ArticleActions";
import { ArticleComments } from "@/components/articles/ArticleComments";
import { FollowButton } from "@/components/articles/FollowButton";
import { ViewBeacon } from "@/components/articles/ViewBeacon";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { BookCover } from "@/components/BookCover";
import { articlePath, parseArticleRef, readingMinutes, topicLabel } from "@/lib/article-format";
import { articleCounts, bodyBlocks, coverUrl, getPublicArticle, listPublicArticles, publicComments, readerState } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth";
import { sampleUrl } from "@/lib/book-sample";
import { coverUrl as bookCoverUrl } from "@/lib/books";
import { createAdminClient } from "@/lib/supabase/admin";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function load(ref: string) {
  const shortId = parseArticleRef(ref);
  return shortId ? getPublicArticle(shortId) : null;
}

export async function generateMetadata({ params }: PageProps<"/articles/[ref]">): Promise<Metadata> {
  const found = await load((await params).ref);
  if (!found) return { title: "Article not found", robots: { index: false } };
  const { article: a, author } = found;
  const cover = coverUrl(a.cover_path);
  const path = articlePath(a);
  return {
    title: a.title,
    description: a.excerpt.slice(0, 200),
    alternates: { canonical: path },
    authors: author.full_name ? [{ name: author.full_name }] : undefined,
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      url: path,
      locale: a.language === "hi" ? "hi_IN" : "en_IN",
      publishedTime: a.first_published_at ?? a.published_at ?? undefined,
      modifiedTime: a.content_updated_at ?? undefined,
      authors: author.full_name ? [author.full_name] : undefined,
      images: cover ? [{ url: cover, alt: a.cover_alt ?? "" }] : undefined,
    },
    twitter: { card: cover ? "summary_large_image" : "summary", title: a.title, description: a.excerpt, images: cover ? [cover] : undefined },
  };
}

export default async function ArticlePage({ params, searchParams }: PageProps<"/articles/[ref]">) {
  const { ref } = await params;
  const sp = await searchParams;
  const found = await load(ref);
  if (!found) notFound();
  const { article: a, author } = found;

  // Old or shortened links (e.g. after a title change) go to the current address
  const path = articlePath(a);
  if (`/articles/${ref}` !== path) {
    const intent = typeof sp.intent === "string" ? `?intent=${encodeURIComponent(sp.intent)}` : "";
    permanentRedirect(`${path}${intent}`);
  }

  const me = await getCurrentProfile();
  const intent = typeof sp.intent === "string" ? sp.intent : null;
  const admin = createAdminClient();
  const [counts, state, more, book] = await Promise.all([
    articleCounts(a.id),
    readerState(me?.id ?? null, a.id, a.author_id),
    listPublicArticles({ authorId: a.author_id, excludeId: a.id, limit: 3 }),
    a.related_book_id
      ? admin.from("books").select("id, slug, title, author_name, cover_path, status, sample_path").eq("id", a.related_book_id).eq("status", "published").maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
  ]);
  const comments = await publicComments(a.id, state.blockedIds);
  const blocks = bodyBlocks(a);
  const cover = coverUrl(a.cover_path);
  const isAuthor = me?.id === a.author_id;
  const name = author.full_name ?? "Eliphas author";
  const profileHref = author.handle ? `/authors/${author.handle}` : null;
  // Shown only when the text changed on a later day than it was first published
  const firstDate = a.first_published_at ?? a.published_at;
  const updated = a.content_updated_at && articleDate(a.content_updated_at) !== articleDate(firstDate) ? a.content_updated_at : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    inLanguage: a.language,
    datePublished: a.first_published_at ?? a.published_at,
    dateModified: a.content_updated_at ?? a.published_at,
    author: { "@type": "Person", name, url: profileHref ? `${site()}${profileHref}` : undefined },
    image: cover ?? undefined,
    mainEntityOfPage: `${site()}${path}`,
    wordCount: a.word_count,
  };

  return (
    <div className="pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {!isAuthor && <ViewBeacon articleId={a.id} />}

      <article className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6 md:pt-8" lang={a.language}>
        <nav aria-label="Breadcrumb" className="truncate text-sm text-muted" lang="en">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
            Home
          </Link>
          <span className="mx-2" aria-hidden>
            ›
          </span>
          <Link href="/articles" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
            Articles
          </Link>
          {a.topic && (
            <>
              <span className="mx-2" aria-hidden>
                ›
              </span>
              <Link href={`/articles?topic=${a.topic}`} className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
                {topicLabel(a.topic)}
              </Link>
            </>
          )}
        </nav>

        <header className="mt-5">
          <p className="eyebrow" lang="en">
            {topicLabel(a.topic)}
          </p>
          <h1 className="mt-2 text-3xl leading-tight break-words md:text-[2.6rem]">{a.title}</h1>
          <p className="mt-3 text-lg text-muted md:text-xl">{a.excerpt}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3" lang="en">
            <AuthorAvatar name={author.full_name} path={author.avatar_path} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{profileHref ? <Link href={profileHref} className="hover:underline hover:underline-offset-2">{name}</Link> : name}</p>
              <p className="text-sm text-muted">
                <time dateTime={firstDate ?? undefined}>{articleDate(firstDate)}</time>
                {updated && (
                  <>
                    {" · Updated "}
                    <time dateTime={updated}>{articleDate(updated)}</time>
                  </>
                )}
                {` · ${readingMinutes(a.word_count)} min read`}
              </p>
            </div>
            {isAuthor ? (
              <Link href={`/author/articles/${a.id}`} className="btn-ghost min-h-10 px-4 text-sm">
                <PenLine className="h-4 w-4" aria-hidden /> Edit
              </Link>
            ) : (
              !state.blockedWithAuthor && <FollowButton authorId={a.author_id} authorName={name} following={state.following} intent={intent} />
            )}
          </div>
        </header>

        {cover && (
          <figure className="mt-6 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
            <img src={cover} alt={a.cover_alt ?? ""} className="h-auto w-full" fetchPriority="high" />
          </figure>
        )}

        <div className="mt-8">
          <ArticleBody blocks={blocks} />
        </div>

        {a.tags.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tags">
            {a.tags.map((t) => (
              <li key={t} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
                #{t}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-y border-line py-4" lang="en">
          <ArticleActions articleId={a.id} title={a.title} url={`${site()}${path}`} liked={state.liked} likes={counts.likes} saved={state.saved} intent={intent} />
        </div>

        {book && (
          <aside aria-label="Related book" className="mt-8 flex gap-4 rounded-xl bg-surface p-4 shadow-soft ring-1 ring-line" lang="en">
            <div className="w-20 shrink-0 sm:w-24">
              <BookCover title={book.title} author={book.author_name} slug={book.slug} src={bookCoverUrl(book.cover_path)} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-accent-fg uppercase">The book behind this article</p>
              <p className="mt-1 text-lg leading-snug font-semibold">{book.title}</p>
              <p className="text-sm text-muted">by {book.author_name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/api/articles/${a.id}/book`} className="btn-primary min-h-10 px-4 text-sm">
                  <BookOpen className="h-4 w-4" aria-hidden /> View book
                </a>
                {book.sample_path && (
                  <a href={sampleUrl(book.sample_path)!} target="_blank" rel="noopener" className="btn-ghost min-h-10 px-4 text-sm" data-testid="article-read-sample">
                    Read sample
                  </a>
                )}
              </div>
            </div>
          </aside>
        )}

        <section aria-label="About the author" className="mt-8 rounded-xl bg-surface-2 p-5" lang="en">
          <div className="flex items-center gap-3">
            <AuthorAvatar name={author.full_name} path={author.avatar_path} size="lg" />
            <div className="min-w-0">
              <p className="text-xs text-muted">Written by</p>
              <p className="text-lg font-semibold">{profileHref ? <Link href={profileHref} className="hover:underline hover:underline-offset-2">{name}</Link> : name}</p>
            </div>
          </div>
          {author.bio && <p className="mt-3 whitespace-pre-line text-fg/90">{author.bio}</p>}
          {profileHref && (
            <Link href={profileHref} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2">
              Books and articles by {name}
            </Link>
          )}
        </section>

        <div className="mt-10" lang="en">
          <ArticleComments
            articleId={a.id}
            signedIn={Boolean(me)}
            canComment={!state.blockedWithAuthor && !state.restricted}
            intent={intent}
            comments={comments.map((c) => ({ id: c.id, body: c.body, created_at: c.created_at, edited_at: c.edited_at, user_id: c.user_id, name: c.name, avatar: c.avatar, mine: c.user_id === me?.id }))}
          />
        </div>

        <p className="mt-10 text-xs text-muted" lang="en">
          Articles are written and published by authors. Eliphas Indicus doesn&apos;t edit them before they appear; readers can report anything that breaks our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            terms
          </Link>
          , and our team reviews every report.
        </p>
      </article>

      {more.articles.length > 0 && (
        <section className="container-x mt-12" aria-labelledby="more-h" lang="en">
          <h2 id="more-h" className="mb-4 text-xl">
            More by {name}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.articles.map((m) => (
              <li key={m.id} className="flex">
                <ArticleCard a={m} showAuthor={false} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
