/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage */
import Link from "next/link";
import { articlePath, readingMinutes, topicLabel } from "@/lib/article-format";
import { coverUrl, type ArticleCard as Card } from "@/lib/articles";
import { AuthorAvatar } from "./AuthorAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

export const articleDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

export function ArticleCard({ a, showAuthor = true }: { a: Card; showAuthor?: boolean }) {
  const cover = coverUrl(a.cover_path);
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-line transition-shadow hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus" lang={a.language}>
      {cover && (
        <div className="aspect-[16/9] overflow-hidden bg-surface-2">
          <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="flex items-center gap-2" lang="en">
          <span className="mono rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem] tracking-[0.04em] text-muted uppercase">{topicLabel(a.topic)}</span>
          {a.language === "hi" && <span className="text-xs text-muted">Hindi</span>}
        </p>
        <h3 className="mt-2 text-xl leading-snug font-semibold tracking-[-0.01em]">
          <Link href={articlePath(a)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {a.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-3 text-sm text-fg/90">{a.excerpt}</p>
        <p className="mt-auto flex flex-wrap items-center gap-x-1.5 pt-4 text-xs text-muted" lang="en">
          {showAuthor && a.author?.full_name && (
            <span className="inline-flex items-center gap-1 font-medium text-fg">
              {a.author.full_name}
              {a.author.verified_author_at && <VerifiedBadge compact />}
              <span className="font-normal text-muted"> ·</span>
            </span>
          )}
          <time dateTime={a.published_at ?? undefined}>{articleDate(a.published_at)}</time> · <span className="mono">{readingMinutes(a.word_count)} min read</span>
        </p>
      </div>
    </article>
  );
}

/** The newest article, large, on ivory with its cover beside it. */
export function ArticleSpotlight({ a }: { a: Card }) {
  const cover = coverUrl(a.cover_path);
  return (
    <article className="relative grid overflow-hidden rounded-[18px] bg-ivory ring-1 ring-line has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" lang={a.language} data-testid="article-spotlight">
      <div className="flex flex-col p-5 sm:p-8">
        <p className="flex flex-wrap items-center gap-2 text-[0.7rem]" lang="en">
          <span className="mono inline-flex items-center gap-1.5 rounded-full bg-tint-warn px-2 py-0.5 tracking-[0.06em] text-marigold-fg uppercase ring-1 ring-marigold/30">
            <span className="h-1.5 w-1.5 rounded-full bg-marigold" aria-hidden /> Newest
          </span>
          <span className="mono tracking-[0.06em] text-muted uppercase">{topicLabel(a.topic)}</span>
        </p>
        <h3 className="display mt-3 text-[1.625rem] leading-tight sm:text-[2rem]">
          <Link href={articlePath(a)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {a.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-4 border-l-2 border-marigold pl-4 font-serif text-[1.0625rem] leading-relaxed text-fg/85 italic">{a.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-5 text-sm text-muted" lang="en">
          {a.author?.full_name && (
            <span className="inline-flex items-center gap-2 font-medium text-fg">
              <AuthorAvatar name={a.author.full_name} path={a.author.avatar_path ?? null} size="sm" />
              {a.author.full_name}
              {a.author.verified_author_at && <VerifiedBadge compact />}
            </span>
          )}
          <time dateTime={a.published_at ?? undefined}>{articleDate(a.published_at)}</time>
          <span className="mono text-xs">{readingMinutes(a.word_count)} min read</span>
        </div>
        <p className="mt-5" aria-hidden>
          <span className="btn-primary pointer-events-none">Read the article →</span>
        </p>
      </div>
      {cover ? (
        <div className="order-first min-h-48 bg-surface-2 md:order-none">
          <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="hidden items-center justify-center bg-primary/5 md:flex" aria-hidden>
          <span className="font-serif text-[7rem] leading-none text-primary/15">“</span>
        </div>
      )}
    </article>
  );
}

export function ArticleGrid({ articles, showAuthor = true }: { articles: Card[]; showAuthor?: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a) => (
        <li key={a.id} className="flex">
          <ArticleCard a={a} showAuthor={showAuthor} />
        </li>
      ))}
    </ul>
  );
}
