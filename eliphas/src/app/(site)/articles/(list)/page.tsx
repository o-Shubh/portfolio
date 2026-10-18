import { PenLine, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArticleGrid, ArticleSpotlight } from "@/components/ArticleCard";
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
  // The newest article leads the first unfiltered page
  const spotlight = !filtered && page === 1 && articles.length > 1 ? articles[0] : null;
  const others = spotlight ? articles.slice(1) : articles;

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

      <span className="eyebrow mt-2">From our authors</span>
      <h1 className="display mt-1 text-[1.75rem] md:text-4xl">{q ? `Articles matching “${q}”` : "Articles"}</h1>
      <p className="mt-1 max-w-2xl text-muted">Essays, reflections and writing advice from Eliphas authors, in English and Hindi. Free to read, newest first.</p>

      <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-2 p-3 md:flex-row md:items-center">
        <form action="/articles" role="search" className="flex flex-1 gap-2">
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
        <div className="segmented shrink-0 self-start bg-surface lg:self-auto" aria-label="Language">
          {LANGS.map((l) => (
            <Link key={l.value} href={href({ lang: l.value || undefined, page: undefined })} aria-current={(lang ?? "") === l.value ? "true" : undefined} className="segment px-4 aria-[current=true]:bg-surface-3">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Topic">
          <Chip href={href({ topic: undefined, page: undefined })} active={!topic} label="All topics" />
          {TOPICS.map((t) => (
            <Chip key={t.value} href={href({ topic: t.value, page: undefined })} active={topic === t.value} label={t.label} />
          ))}
        </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {total === 1 ? "1 article" : `${total} articles`}
      </p>

      <div className="mt-3">
        {articles.length ? (
          spotlight ? (
            <div className="space-y-8">
              <ArticleSpotlight a={spotlight} />
              {others.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg">More articles</h2>
                  <ArticleGrid articles={others} />
                </section>
              )}
            </div>
          ) : (
            <ArticleGrid articles={articles} />
          )
        ) : (
          <div className="rounded-[var(--radius-card)] bg-surface px-6 py-16 text-center ring-1 ring-line">
            <p className="display text-xl">{filtered ? "No articles found" : "No articles yet"}</p>
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
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3">
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

      <section className="mt-12 flex flex-col gap-4 rounded-[18px] bg-primary p-6 text-on-primary md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h2 className="display text-2xl text-on-primary">Write for Eliphas</h2>
          <p className="mt-1.5 max-w-xl text-sm text-on-primary/80">Verified authors can publish articles alongside their books. Every article follows our community guidelines.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/author/articles" className="btn min-h-11 bg-white text-primary hover:bg-white/90">
            <PenLine className="h-4 w-4" aria-hidden /> Write an article
          </Link>
          <Link href="/community-guidelines" className="btn min-h-11 bg-white/10 text-on-primary hover:bg-white/15">
            Community guidelines
          </Link>
        </div>
      </section>
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
