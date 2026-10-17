import { PenLine, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArticleGrid } from "@/components/ArticleCard";
import { TOPICS } from "@/lib/article-format";
import { listPublicArticles, PAGE_SIZE } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles",
  description: "Essays, reflections and writing advice from Eliphas Indicus authors, in English and Hindi. Free to read.",
  alternates: { canonical: "/articles" },
};

const LANGS = [
  { value: "", label: "All" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
] as const;

export default async function ArticlesPage({ searchParams }: PageProps<"/articles">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const lang = sp.lang === "hi" || sp.lang === "en" ? sp.lang : undefined;
  const topic = typeof sp.topic === "string" && TOPICS.some((t) => t.value === sp.topic) ? sp.topic : undefined;
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  const { articles, total } = await listPublicArticles({ q, lang, topic, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || lang || topic);

  const href = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q || undefined, lang, topic, ...changes })) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/articles?${s}` : "/articles";
  };

  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">Articles</span>
      </nav>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">From our authors</span>
          <h1 className="mt-1 text-2xl md:text-3xl">{q ? `Articles matching “${q}”` : "Articles"}</h1>
          <p className="mt-1 text-sm text-muted">Essays, reflections and writing advice. Free to read, newest first.</p>
        </div>
        <form action="/articles" role="search" className="flex w-full gap-2 md:max-w-sm">
          {lang && <input type="hidden" name="lang" value={lang} />}
          {topic && <input type="hidden" name="topic" value={topic} />}
          <label htmlFor="aq" className="sr-only">
            Search articles by title, excerpt or author
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden />
            <input id="aq" name="q" type="search" defaultValue={q} placeholder="Title, excerpt or author" className="field pl-10" />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-surface p-3 shadow-soft ring-1 ring-line lg:flex-row lg:items-center">
        <div className="flex shrink-0 rounded-lg bg-surface-2 p-1" aria-label="Language">
          {LANGS.map((l) => {
            const active = (lang ?? "") === l.value;
            return (
              <Link
                key={l.value}
                href={href({ lang: l.value || undefined, page: undefined })}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm transition md:min-h-8 ${active ? "bg-primary font-medium text-on-primary" : "text-muted hover:text-fg"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" aria-label="Topic">
          <Chip href={href({ topic: undefined, page: undefined })} active={!topic} label="All topics" />
          {TOPICS.map((t) => (
            <Chip key={t.value} href={href({ topic: t.value, page: undefined })} active={topic === t.value} label={t.label} />
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {total === 1 ? "1 article" : `${total} articles`}
      </p>

      <div className="mt-3">
        {articles.length ? (
          <ArticleGrid articles={articles} />
        ) : (
          <div className="rounded-xl bg-surface px-6 py-16 text-center shadow-soft ring-1 ring-line">
            <p className="text-xl font-semibold">{filtered ? "No articles found" : "No articles yet"}</p>
            <p className="mt-2 text-muted">{filtered ? "Try a different word, or clear the filters." : "Our authors' first articles will appear here."}</p>
            {filtered ? (
              <Link href="/articles" className="btn-ghost mt-6">
                Clear filters
              </Link>
            ) : (
              <Link href="/author/articles" className="btn-ghost mt-6">
                <PenLine className="h-4 w-4" aria-hidden /> Write an article
              </Link>
            )}
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-14 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={href({ page: String(page - 1) })}>
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={href({ page: String(page + 1) })}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="chip bg-surface"
    >
      {label}
    </Link>
  );
}
