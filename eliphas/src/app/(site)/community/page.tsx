import { Check, MessagesSquare, ShieldCheck } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Metadata } from "next";
import Link from "next/link";
import { Composer } from "@/components/community/Composer";
import { PostCard } from "@/components/community/PostCard";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentProfile } from "@/lib/auth";
import { FEED_PAGE, listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Community",
  description: "Readers and authors on Eliphas Indicus sharing their views on books and writing.",
  alternates: { canonical: "/community" },
};

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const sp = await searchParams;
  const me = await getCurrentProfile();
  const mode = sp.feed === "following" ? "following" : "discover";
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const { posts, total } = await listPosts({ mode, userId: me?.id ?? null, page });
  const pages = Math.max(1, Math.ceil(total / FEED_PAGE));
  const myBooks = me?.verified_author_at
    ? ((await createAdminClient().from("books").select("id, title").eq("author_id", me.id).eq("status", "published").order("title")).data ?? [])
    : [];
  const verifiedAuthors = ((await createAdminClient().from("public_profiles").select("id, handle, full_name, avatar_path").eq("verified_author", true).eq("is_author", true).not("handle", "is", null).limit(5)).data ?? []);
  const href = (changes: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ feed: mode === "following" ? "following" : undefined, ...changes })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/community?${s}` : "/community";
  };

  const feeds = [
    { key: "discover", label: "Discover", note: "Everyone, newest first", href: "/community" },
    { key: "following", label: "Following", note: "People you follow", href: me ? "/community?feed=following" : `/login?next=${encodeURIComponent("/community?feed=following")}` },
  ];

  return (
    <div className="container-x py-5 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[1.75rem] md:text-4xl">Community</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Readers and authors sharing views on books and writing. Long-form pieces by verified authors are in{" "}
            <Link href="/articles" className="font-medium text-accent-fg hover:underline">
              Articles
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_17rem] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Feed">
            <p className="mb-2 hidden text-xs font-semibold tracking-[0.06em] text-muted uppercase lg:block">Feeds</p>
            {/* Phones: a segmented control. Desktop: a sidebar list. */}
            <div className="segmented lg:hidden">
              {feeds.map((t) => (
                <Link key={t.key} href={t.href} aria-current={mode === t.key ? "page" : undefined} className="segment px-5">
                  {t.label}
                </Link>
              ))}
            </div>
            <ul className="hidden space-y-0.5 lg:block">
              {feeds.map((t) => (
                <li key={t.key}>
                  <Link
                    href={t.href}
                    aria-current={mode === t.key ? "page" : undefined}
                    className="block rounded-[var(--radius-control)] px-3 py-2 text-sm hover:bg-surface-2 aria-[current=page]:bg-primary aria-[current=page]:text-on-primary"
                  >
                    <span className="block font-medium">{t.label}</span>
                    <span className="block text-xs opacity-75">{t.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {me && (
            <Link href="/account/saved" className="mt-3 hidden min-h-9 items-center rounded-[var(--radius-control)] px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg lg:flex">
              Saved posts
            </Link>
          )}
        </aside>

        <div className="min-w-0">
          {me?.full_name ? (
            <Composer name={me.full_name} books={myBooks} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
              <p className="text-muted">Join the conversation. Reading is open to everyone.</p>
              <Link href={`/login?next=${encodeURIComponent("/community")}`} className="btn-primary">
                Log in to post
              </Link>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {posts.length === 0 ? (
              mode === "following" ? (
                <EmptyState icon={MessagesSquare} title="Nothing from people you follow yet" text="Follow authors and readers from their profiles to see their posts here." action={<Link href="/authors" className="btn-ghost">Find authors</Link>} />
              ) : (
                <EmptyState icon={MessagesSquare} title="No posts yet" text="Be the first to share what you're reading or writing." />
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
              <span className="mono text-sm text-muted">
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

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="About the community">
          <section className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-accent-fg" aria-hidden /> Community guidelines
            </h2>
            <ul className="mt-2.5 space-y-2 text-sm text-fg/90">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> Discuss the work, not the person.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> Share only what you have the right to share.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> Report posts that break the rules; our team reviews every report.
              </li>
            </ul>
            <Link href="/community-guidelines" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent-fg hover:underline md:min-h-0">
              Read the full guidelines
            </Link>
          </section>
          {verifiedAuthors.length > 0 && (
            <section className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
              <h2 className="text-sm font-semibold">Verified authors</h2>
              <ul className="mt-2 divide-y divide-line">
                {verifiedAuthors.map((a) => (
                  <li key={a.id}>
                    <Link href={`/authors/${a.handle}`} className="flex min-h-11 items-center gap-2.5 py-1.5 text-sm hover:text-accent-fg">
                      <AuthorAvatar name={a.full_name} path={a.avatar_path} size="sm" />
                      <span className="truncate font-medium">{a.full_name}</span>
                      <VerifiedBadge compact />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/authors?verified=1" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent-fg hover:underline md:min-h-0">
                All verified authors
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
