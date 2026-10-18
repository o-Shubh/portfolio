/* eslint-disable @next/next/no-img-element -- images come from Supabase Storage */
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { postImageUrl, profilePath, type FeedPost } from "@/lib/posts";
import { PostActions } from "./PostActions";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const postDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

/** One community post (reader or author): author, text, optional image and related book, then actions. */
export function PostCard({ post, intent, linkToPost = true }: { post: FeedPost; intent?: string | null; linkToPost?: boolean }) {
  const img = postImageUrl(post.image_path);
  const name = post.author?.full_name ?? "Author";
  const profile = profilePath(post.author);
  return (
    <article className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line sm:p-5" data-testid="post">
      <header className="flex items-center gap-3">
        <AuthorAvatar name={post.author?.full_name ?? null} path={post.author?.avatar_path} size="md" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            {profile ? <Link href={profile} className="hover:underline">{name}</Link> : name}
            {post.author?.verified_author_at && <VerifiedBadge compact />}
          </p>
          <p className="text-xs text-muted">
            {linkToPost ? (
              <Link href={`/community/${post.id}`} className="hover:underline">
                <time dateTime={post.published_at ?? undefined}>{postDate(post.published_at)}</time>
              </Link>
            ) : (
              <time dateTime={post.published_at ?? undefined}>{postDate(post.published_at)}</time>
            )}
            {post.edited_at && " · edited"}
          </p>
        </div>
      </header>
      <p className="mt-3 font-serif text-[1.0625rem] leading-relaxed break-words whitespace-pre-line">{post.body}</p>
      {img && <img src={img} alt={post.image_alt ?? ""} loading="lazy" decoding="async" className="mt-3 max-h-[28rem] w-full rounded-[var(--radius-control)] bg-surface-2 object-cover ring-1 ring-line" />}
      {post.book && (
        <Link href={`/books/${post.book.slug}`} className="mt-3 flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-sm hover:bg-[color-mix(in_srgb,var(--surface-2),var(--fg)_5%)]">
          <BookOpen className="h-4 w-4 shrink-0 text-accent-fg" aria-hidden />
          <span className="min-w-0 truncate">
            <span className="text-muted">Book: </span>
            <span className="font-medium">{post.book.title}</span>
          </span>
        </Link>
      )}
      <div className="mt-2">
        <PostActions postId={post.id} liked={post.liked} likes={post.likes} saved={post.saved} comments={post.comments} url={`${site()}/community/${post.id}`} intent={intent} showReplyLink={linkToPost} />
      </div>
    </article>
  );
}
