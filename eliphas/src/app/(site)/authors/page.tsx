import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { EmptyState } from "@/components/EmptyState";
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
  const admin = createAdminClient();
  const [{ data: books }, { data: articles }] = await Promise.all([
    admin.from("books").select("author_id").eq("status", "published"),
    admin.from("articles").select("author_id").eq("status", "published").eq("moderation", "visible"),
  ]);
  const tally = (rows: { author_id: string }[] | null) => (rows ?? []).reduce((m, r) => m.set(r.author_id, (m.get(r.author_id) ?? 0) + 1), new Map<string, number>());
  const bookCount = tally(books);
  const articleCount = tally(articles);
  const active = [...new Set([...bookCount.keys(), ...articleCount.keys()])];

  let query = admin.from("public_authors").select("id, handle, full_name, bio, avatar_path", { count: "exact" }).order("full_name").range((page - 1) * PAGE, page * PAGE - 1);
  query = active.length ? query.in("id", active) : query.in("id", ["00000000-0000-0000-0000-000000000000"]);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data: authors, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <div className="container-x py-6 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[1.75rem] md:text-[2.125rem]">Authors</h1>
          <p className="mt-1 text-muted">Independent writers publishing with Eliphas. Follow them to hear about new books, articles and updates.</p>
        </div>
        <form action="/authors" role="search" className="flex w-full gap-2 md:max-w-sm">
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
      </div>

      {!authors?.length ? (
        <div className="mt-8">
          <EmptyState icon={Users} title={q ? "No authors found" : "No authors yet"} text={q ? "Try a different name." : "Authors appear here once their first book or article is published."} action={q ? <Link href="/authors" className="btn-ghost">Show all authors</Link> : undefined} />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => {
            const b = bookCount.get(a.id!) ?? 0;
            const ar = articleCount.get(a.id!) ?? 0;
            return (
              <li key={a.id}>
                <Link href={`/authors/${a.handle}`} className="flex h-full items-start gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift">
                  <AuthorAvatar name={a.full_name} path={a.avatar_path} size="lg" />
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold">{a.full_name}</span>
                    <span className="block text-sm text-muted tabular-nums">
                      {b} {b === 1 ? "book" : "books"} · {ar} {ar === 1 ? "article" : "articles"}
                    </span>
                    {a.bio && <span className="mt-2 line-clamp-3 block text-sm text-fg/85">{a.bio}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={`/authors?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={`/authors?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
