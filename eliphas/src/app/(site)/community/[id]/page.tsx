import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/PostCard";
import { PostComments } from "@/components/community/PostComments";
import { readerState } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth";
import { COMMENTS_PAGE, getPublicPost, postComments, postImageUrl } from "@/lib/posts";

export async function generateMetadata({ params }: PageProps<"/community/[id]">): Promise<Metadata> {
  const post = await getPublicPost((await params).id, null);
  if (!post) return { title: "Update not found", robots: { index: false } };
  const name = post.author?.full_name ?? "Author";
  const text = post.body.replace(/\s+/g, " ").slice(0, 160);
  const img = postImageUrl(post.image_path);
  return {
    title: `${name} on Eliphas Community`,
    description: text,
    alternates: { canonical: `/community/${post.id}` },
    openGraph: { type: "article", title: `${name} on Eliphas`, description: text, images: img ? [{ url: img, alt: post.image_alt ?? "" }] : undefined },
  };
}

export default async function PostPage({ params, searchParams }: PageProps<"/community/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await getCurrentProfile();
  const post = await getPublicPost(id, me?.id ?? null);
  if (!post) notFound();
  const state = await readerState(me?.id ?? null, "00000000-0000-0000-0000-000000000000", post.author?.id ?? "");
  const cpage = Math.max(1, Math.min(500, Number(sp.cpage) || 1));
  const { comments, totalTop } = await postComments(post.id, state.blockedIds, cpage);
  const intent = typeof sp.intent === "string" ? sp.intent : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/community" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          ← Community
        </Link>
      </nav>
      <div className="mt-3">
        <PostCard post={post} intent={intent} linkToPost={false} />
      </div>
      <div className="mt-8">
        <PostComments
          postId={post.id}
          page={cpage}
          pageSize={COMMENTS_PAGE}
          totalTop={totalTop}
          signedIn={Boolean(me)}
          canComment={!state.blockedWithAuthor && !state.restricted}
          intent={intent}
          comments={comments.map((c) => ({ ...c, mine: c.user_id === me?.id }))}
        />
      </div>
    </div>
  );
}
