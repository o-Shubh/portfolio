import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/community/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentProfile } from "@/lib/auth";
import { FEED_PAGE, listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Community",
  description: "Short updates from Eliphas Indicus authors: new books, events and work in progress.",
  alternates: { canonical: "/community" },
};

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const sp = await searchParams;
  const me = await getCurrentProfile();
  const mode = sp.feed === "following" ? "following" : "discover";
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const { posts, total } = await listPosts({ mode, userId: me?.id ?? null, page });
  const pages = Math.max(1, Math.ceil(total / FEED_PAGE));
  const isAuthor = me && ["author", "admin"].includes(me.role);
  const href = (changes: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ feed: mode === "following" ? "following" : undefined, ...changes })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/community?${s}` : "/community";
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] md:text-[2.125rem]">Community</h1>
          <p className="mt-1 text-muted">Short updates from our authors, newest first. Longer pieces are in <Link href="/articles" className="font-medium text-accent-fg hover:underline">Articles</Link>.</p>
        </div>
        {isAuthor && (
          <Link href="/author/community" className="btn-primary">
            Post an update
          </Link>
        )}
      </div>

      <nav aria-label="Feed" className="mt-5 flex w-fit rounded-full bg-surface-2 p-1">
        {[
          { key: "discover", label: "Discover" },
          { key: "following", label: "Following" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.key === "following" ? (me ? "/community?feed=following" : `/login?next=${encodeURIComponent("/community?feed=following")}`) : "/community"}
            aria-current={mode === t.key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold md:min-h-9 ${mode === t.key ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 space-y-4">
        {posts.length === 0 ? (
          mode === "following" ? (
            <EmptyState icon={MessagesSquare} title="Nothing from authors you follow yet" text="Follow authors from their profile, book or article pages to see their updates here." action={<Link href="/authors" className="btn-ghost">Find authors</Link>} />
          ) : (
            <EmptyState icon={MessagesSquare} title="No updates yet" text="When authors share news about their books, it will appear here." />
          )
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link className="btn-ghost" href={href({ page: String(page - 1) })}>
              Newer
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn-ghost" href={href({ page: String(page + 1) })}>
              Older
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
