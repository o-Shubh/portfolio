import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { FollowButton } from "@/components/articles/FollowButton";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { PostCard } from "@/components/community/PostCard";
import { EmptyState } from "@/components/EmptyState";
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
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <header className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft ring-1 ring-line">
        <AuthorAvatar name={p.full_name} path={p.avatar_path} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl">{p.full_name}</h1>
          <p className="text-sm text-muted tabular-nums">
            Reader · {followers ?? 0} {followers === 1 ? "follower" : "followers"}
          </p>
          {p.bio && <p className="mt-2 whitespace-pre-line">{p.bio}</p>}
        </div>
        {me?.id !== p.id && !state.blockedWithAuthor && <FollowButton authorId={p.id!} authorName={p.full_name ?? "this member"} following={state.following} />}
      </header>
      <h2 className="mt-8 text-xl">Posts</h2>
      <div className="mt-3 space-y-4">
        {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <EmptyState icon={MessagesSquare} title="No posts yet" />}
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && <Link className="btn-ghost" href={`/u/${p.handle}?page=${page - 1}`}>Newer</Link>}
          <span className="text-sm text-muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-ghost" href={`/u/${p.handle}?page=${page + 1}`}>Older</Link>}
        </nav>
      )}
    </div>
  );
}
