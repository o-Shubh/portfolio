import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { articlePath, VIEWS_NOTE } from "@/lib/article-format";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewArticleButton } from "./NewArticleButton";

export const metadata: Metadata = { title: "My articles", robots: { index: false } };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export default async function MyArticlesPage() {
  const profile = await requireRole(["author", "admin"]);
  const verified = profile.role === "admin" || Boolean(profile.verified_author_at);
  const admin = createAdminClient();
  const { data: articles } = await admin
    .from("articles")
    .select("id, short_id, slug, title, status, moderation, updated_at, published_at, first_published_at")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });
  const ids = (articles ?? []).map((a) => a.id);
  const [likes, comments, views] = ids.length
    ? await Promise.all([
        admin.from("article_likes").select("article_id").in("article_id", ids),
        admin.from("article_comments").select("article_id").in("article_id", ids).eq("moderation", "visible"),
        admin.from("article_views").select("article_id").in("article_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const tally = (rows: { article_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.article_id === id).length;

  return (
    <>
      <PageHeader
        title="My articles"
        intro="Essays, reflections, writing advice and authorised excerpts from your books. Free to read. Articles go live when you publish them; readers can report problems and our team moderates."
        action={verified ? <NewArticleButton /> : undefined}
      />
      {!verified && (
        <div role="note" className="card mb-6 text-sm" data-testid="articles-verify">
          <p className="font-semibold">Articles are for verified authors</p>
          <p className="mt-1 text-muted">
            Apply once and our team reviews your authorship. Articles you&apos;ve already published stay up, and you can post updates in Community at any time.
          </p>
          <Link href="/account/verification" className="btn-primary mt-3 inline-flex">
            Apply for verification
          </Link>
        </div>
      )}
      {!articles?.length ? (
        <div className="card text-center">
          <p className="text-lg">You haven&apos;t written an article yet.</p>
          <p className="mt-1 text-sm text-muted">Start with something readers can&apos;t find on your book page: why you wrote it, how you work, what you&apos;ve learned.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-line py-0">
          {articles.map((a) => {
            const state =
              a.moderation !== "visible" ? { label: a.moderation === "removed" ? "Removed by our team" : "Hidden by our team", tone: "bg-danger/15 text-danger" }
              : a.status === "published" ? { label: "Published", tone: "bg-success/15 text-success" }
              : a.status === "unpublished" ? { label: "Unpublished", tone: "bg-surface-2 text-muted" }
              : { label: "Draft", tone: "bg-accent/20 text-fg" };
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/author/articles/${a.id}`} className="font-medium hover:underline">
                    {a.title || "Untitled article"}
                  </Link>
                  <p className="text-sm text-muted">
                    {a.status === "published" && a.published_at ? `Published ${fmt(a.published_at)}` : `Edited ${fmt(a.updated_at)}`}
                    {a.first_published_at && (
                      <span className="tabular-nums">
                        {" "}· {tally(views.data, a.id)} views · {tally(likes.data, a.id)} likes · {tally(comments.data, a.id)} comments
                      </span>
                    )}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                <span className="flex gap-3 text-sm font-semibold">
                  <Link href={`/author/articles/${a.id}`} className="inline-flex min-h-11 items-center underline">
                    Edit
                  </Link>
                  {a.status === "published" && a.moderation === "visible" && (
                    <Link href={articlePath(a)} className="inline-flex min-h-11 items-center underline">
                      View
                    </Link>
                  )}
                  {a.first_published_at && (
                    <Link href={`/author/articles/${a.id}/stats`} className="inline-flex min-h-11 items-center underline">
                      Readership
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">{VIEWS_NOTE}</p>
    </>
  );
}
