import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/PostCard";
import { BookCover } from "@/components/BookCover";
import { coverUrl, getPublishedBook } from "@/lib/books";
import { rupees } from "@/lib/pricing";
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

  const book = post.book ? await getPublishedBook(post.book.slug) : null;

  return (
    <div className="container-x py-5 md:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/community" className="inline-flex min-h-11 items-center hover:text-fg md:min-h-0">
          ← Community
        </Link>
      </nav>
      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="min-w-0 max-w-3xl">
          <PostCard post={post} intent={intent} linkToPost={false} />
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
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Related">
          {book && (
            <section className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-line">
              <h2 className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Book in this post</h2>
              <div className="mt-3 flex gap-3">
                <div className="w-20 shrink-0">
                  <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" />
                </div>
                <div className="min-w-0">
                  <p className=" leading-snug font-semibold" lang={book.language}>
                    {book.title}
                  </p>
                  <p className="text-xs text-muted">{book.author_name}</p>
                  <p className="mono mt-1.5 text-sm">{rupees(Number(book.mrp))}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={book.sample_path ? `/books/${book.slug}/sample` : `/books/${book.slug}`} className="btn-tinted min-h-11 px-2 text-sm pointer-fine:min-h-9">
                  {book.sample_path ? "Read a sample" : "View book"}
                </Link>
                <Link href={`/checkout/${book.slug}`} className="btn-accent min-h-11 px-2 text-sm pointer-fine:min-h-9">
                  Buy now
                </Link>
              </div>
            </section>
          )}
          <p className="rounded-[var(--radius-card)] bg-surface-2 p-4 text-xs text-muted">
            Posts are written by members. Report anything that breaks our{" "}
            <Link href="/community-guidelines" className="underline underline-offset-2">
              community guidelines
            </Link>
            ; our team reviews every report.
          </p>
        </aside>
      </div>
    </div>
  );
}
