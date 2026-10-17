/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage */
import Link from "next/link";
import { articlePath, readingMinutes, topicLabel } from "@/lib/article-format";
import { coverUrl, type ArticleCard as Card } from "@/lib/articles";

export const articleDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

export function ArticleCard({ a, showAuthor = true }: { a: Card; showAuthor?: boolean }) {
  const cover = coverUrl(a.cover_path);
  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift" lang={a.language}>
      {cover && (
        <Link href={articlePath(a)} tabIndex={-1} aria-hidden className="block aspect-[16/9] overflow-hidden bg-surface-2">
          <img src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold tracking-wide text-accent-fg uppercase" lang="en">
          {topicLabel(a.topic)}
          {a.language === "hi" && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-muted normal-case">हिन्दी</span>}
        </p>
        <h3 className="mt-1.5 font-serif text-xl leading-snug tracking-[-0.01em]">
          <Link href={articlePath(a)} className="hover:underline hover:underline-offset-2">
            {a.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-3 text-sm text-muted">{a.excerpt}</p>
        <p className="mt-auto pt-3 text-xs text-muted" lang="en">
          {showAuthor && a.author?.full_name && <span className="font-medium text-fg">{a.author.full_name} · </span>}
          <time dateTime={a.published_at ?? undefined}>{articleDate(a.published_at)}</time> · {readingMinutes(a.word_count)} min read
        </p>
      </div>
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
