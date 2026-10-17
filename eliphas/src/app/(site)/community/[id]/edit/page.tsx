import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/community/PostEditor";
import { getCurrentProfile } from "@/lib/auth";
import { postImageUrl } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Edit post", robots: { index: false } };

/** Owner-only editor for a post (readers and authors). */
export default async function EditPostPage({ params }: PageProps<"/community/[id]/edit">) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/community/${id}/edit`)}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: p } = await admin.from("posts").select("*").eq("id", id).maybeSingle();
  if (!p || p.author_id !== me.id) notFound();
  const { data: books } = me.verified_author_at ? await admin.from("books").select("id, title").eq("author_id", me.id).eq("status", "published").order("title") : { data: [] };
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10">
      <Link href="/community" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-fg">
        ← Community
      </Link>
      <h1 className="mt-1 mb-5 text-[1.75rem]">{p.status === "published" ? "Edit post" : "Draft post"}</h1>
      <PostEditor
        id={p.id}
        status={p.status as "draft" | "published"}
        moderated={p.moderation === "visible" ? null : p.moderation}
        initial={{ body: p.body, image_alt: p.image_alt ?? "", related_book_id: p.related_book_id ?? "" }}
        imageUrl={postImageUrl(p.image_path)}
        books={books ?? []}
        canLinkBook={Boolean(me.verified_author_at)}
        publicPath={`/community/${p.id}`}
      />
    </div>
  );
}
