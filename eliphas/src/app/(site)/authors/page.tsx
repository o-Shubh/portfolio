import { BadgeCheck, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Authors",
  description: "Independent authors publishing in Hindi and English with Eliphas Indicus.",
  alternates: { canonical: "/authors" },
};

const PAGE = 24;

/** Authors with at least one live book or published article, alphabetically. Public details only. */
export default async function AuthorsPage({ searchParams }: PageProps<"/authors">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%_,().*\\]/g, " ").trim().slice(0, 60) : "";
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const onlyVerified = sp.verified === "1";
  const admin = createAdminClient();
  const [{ data: books }, { data: articles }, { data: verifiedRows }] = await Promise.all([
    admin.from("books").select("author_id, title, slug, language").eq("status", "published").order("published_at", { ascending: false }),
    admin.from("articles").select("author_id").eq("status", "published").eq("moderation", "visible"),
    admin.from("public_profiles").select("id").eq("verified_author", true),
  ]);
  const verified = new Set((verifiedRows ?? []).map((r) => r.id as string));
  const latest = new Map<string, { title: string; slug: string; language: string }>();
  for (const b of books ?? []) if (!latest.has(b.author_id)) latest.set(b.author_id, b);
  const tally = (rows: { author_id: string }[] | null) => (rows ?? []).reduce((m, r) => m.set(r.author_id, (m.get(r.author_id) ?? 0) + 1), new Map<string, number>());
  const bookCount = tally(books);
  const articleCount = tally(articles);
  const active = [...new Set([...bookCount.keys(), ...articleCount.keys()])].filter((id) => !onlyVerified || verified.has(id));
  const link = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q || undefined, verified: onlyVerified ? "1" : undefined, page: undefined, ...changes })) if (v) params.set(k, v);
    const str = params.toString();
    return str ? `/authors?${str}` : "/authors";
  };

  let query = admin.from("public_authors").select("id, handle, full_name, bio, avatar_path", { count: "exact" }).order("full_name").range((page - 1) * PAGE, page * PAGE - 1);
  query = active.length ? query.in("id", active) : query.in("id", ["00000000-0000-0000-0000-000000000000"]);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data: authors, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <div className="container-x py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Home
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">Authors</span>
      </nav>
      <h1 className="display mt-2 text-[1.75rem] md:text-4xl">Authors</h1>
      <p className="mt-1 max-w-2xl text-muted">Independent writers publishing with Eliphas in Hindi and English. Follow them to hear about new books, articles and updates.</p>

      <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-2 p-3 md:flex-row md:items-center">
        <form action="/authors" role="search" className="flex flex-1 gap-2">
          {onlyVerified && <input type="hidden" name="verified" value="1" />}
          <label htmlFor="aq" className="sr-only">
            Search authors by name
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden />
            <input id="aq" name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder="Author name" className="field pl-10" />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
        <div className="segmented self-start md:self-auto" aria-label="Show">
          <Link href={link({ verified: undefined })} aria-current={!onlyVerified ? "true" : undefined} className="segment px-4">
            All authors
          </Link>
          <Link href={link({ verified: "1" })} aria-current={onlyVerified ? "true" : undefined} className="segment px-4">
            <BadgeCheck className="h-4 w-4" aria-hidden /> Verified
          </Link>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {count === 1 ? "1 author" : `${count ?? 0} authors`}
        {onlyVerified && " · verified only"}
      </p>

      {!authors?.length ? (
        <div className="mt-3">
          <EmptyState
            icon={Users}
            title={q || onlyVerified ? "No authors found" : "No authors yet"}
            text={q ? "Try a different name." : onlyVerified ? "No verified authors match yet." : "Authors appear here once their first book or article is published."}
            action={q || onlyVerified ? <Link href="/authors" className="btn-ghost">Show all authors</Link> : undefined}
          />
        </div>
      ) : (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => {
            const b = bookCount.get(a.id!) ?? 0;
            const ar = articleCount.get(a.id!) ?? 0;
            const book = latest.get(a.id!);
            return (
              <li key={a.id}>
                <article className="relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus sm:p-5">
                  <div className="flex items-start gap-3.5">
                    <AuthorAvatar name={a.full_name} path={a.avatar_path} size="lg" />
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-1.5 text-lg font-semibold tracking-normal">
                        <Link href={`/authors/${a.handle}`} className="truncate after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                          {a.full_name}
                        </Link>
                        {verified.has(a.id!) && <VerifiedBadge compact />}
                      </h2>
                      <p className="mono mt-0.5 text-xs text-muted">
                        {b} {b === 1 ? "book" : "books"} · {ar} {ar === 1 ? "article" : "articles"}
                      </p>
                    </div>
                  </div>
                  {a.bio && <p className="mt-3 line-clamp-3 text-sm text-fg/85">{a.bio}</p>}
                  {book && (
                    <p className="mt-3 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-sm">
                      <span className="block text-[0.7rem] font-semibold tracking-[0.06em] text-muted uppercase">Latest book</span>
                      <span className="mt-0.5 block truncate" lang={book.language}>
                        {book.title}
                      </span>
                    </p>
                  )}
                  <p className="mt-auto pt-4 text-sm font-medium text-accent-fg">View profile →</p>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={link({ page: String(page - 1) })}>
              Previous
            </Link>
          )}
          <span className="mono text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={link({ page: String(page + 1) })}>
              Next
            </Link>
          )}
        </nav>
      )}

      <section className="mt-12 flex flex-col gap-4 rounded-[18px] bg-primary p-6 text-on-primary md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h2 className="display text-2xl text-on-primary">Are you an author?</h2>
          <p className="mt-1.5 max-w-xl text-sm text-on-primary/80">
            Publish in Hindi or English with no upfront printing cost. Authors can apply for the Verified badge, which confirms a profile belongs to them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/login/author?mode=signup" className="btn-accent min-h-11">
            Publish your book
          </Link>
          <Link href="/account/verification" className="btn min-h-11 bg-white/10 text-on-primary hover:bg-white/15">
            Apply for verification
          </Link>
        </div>
      </section>
    </div>
  );
}
