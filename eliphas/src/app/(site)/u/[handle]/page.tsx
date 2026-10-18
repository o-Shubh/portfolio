import { MessagesSquare, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { FollowButton } from "@/components/articles/FollowButton";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { PostCard } from "@/components/community/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { ShareButton } from "@/components/ShareButton";
import { readerState } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth";
import { FEED_PAGE, listPosts } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";

async function load(handle: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(handle)) return null;
  const { data } = await createAdminClient().from("public_profiles").select("id, handle, full_name, bio, avatar_path, is_author, verified_author").eq("handle", handle).maybeSingle();
  return data?.id ? data : null;
}

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const p = await load((await params).handle);
  if (!p) return { title: "Profile not found", robots: { index: false } };
  return { title: `${p.full_name} on Eliphas Community`, alternates: { canonical: `/u/${p.handle}` } };
}

/** A member's public profile: name, photo, bio and posts. Never phone numbers, orders or saved items. */
export default async function MemberPage({ params, searchParams }: PageProps<"/u/[handle]">) {
  const { handle } = await params;
  const p = await load(handle);
  if (!p) notFound();
  if (p.is_author) permanentRedirect(`/authors/${p.handle}`);
  const me = await getCurrentProfile();
  const page = Math.max(1, Math.min(200, Number((await searchParams).page) || 1));
  const [state, { posts, total }, { count: followers }] = await Promise.all([
    readerState(me?.id ?? null, "00000000-0000-0000-0000-000000000000", p.id!),
    listPosts({ authorId: p.id!, userId: me?.id ?? null, page }),
    createAdminClient().from("follows").select("*", { count: "exact", head: true }).eq("author_id", p.id!),
  ]);
  const pages = Math.max(1, Math.ceil(total / FEED_PAGE));
  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/community" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          Community
        </Link>
        <span className="mx-2" aria-hidden>
          ›
        </span>
        <span className="text-fg">{p.full_name}</span>
      </nav>
      <header className="mt-2 flex flex-col gap-5 rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line sm:flex-row sm:items-start md:p-7">
        <AuthorAvatar name={p.full_name} path={p.avatar_path} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="display text-[1.75rem] leading-tight md:text-[2.125rem]">{p.full_name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
            <span>Reader</span>
            <span>
              <span className="mono text-fg">{followers ?? 0}</span> {followers === 1 ? "follower" : "followers"}
            </span>
            <span>
              <span className="mono text-fg">{total}</span> {total === 1 ? "post" : "posts"}
            </span>
          </p>
          {p.bio && <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed whitespace-pre-line text-fg/90">{p.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {me?.id !== p.id && !state.blockedWithAuthor && <FollowButton authorId={p.id!} authorName={p.full_name ?? "this member"} following={state.following} />}
            <ShareButton path={`/u/${p.handle}`} title={p.full_name ?? undefined} label="Share profile" />
          </div>
        </div>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="posts-h" className="min-w-0">
          <h2 id="posts-h" className="text-lg">
            Posts
          </h2>
          <div className="mt-3 space-y-4">
            {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <EmptyState icon={MessagesSquare} title="No posts yet" />}
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3">
              {page > 1 && <Link className="btn-ghost" href={`/u/${p.handle}?page=${page - 1}`}>Newer</Link>}
              <span className="mono text-sm text-muted">Page {page} of {pages}</span>
              {page < pages && <Link className="btn-ghost" href={`/u/${p.handle}?page=${page + 1}`}>Older</Link>}
            </nav>
          )}
        </section>
        <aside className="lg:pt-10">
          <div className="notice-info">
            <ShieldCheck className="h-5 w-5 shrink-0 text-accent-fg" aria-hidden />
            <p>Profiles show only a name, photo, bio and public posts. Orders, saved items, reading and phone numbers are never shown.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
