import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { postImageUrl } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";
import { PostEditor } from "./PostEditor";

export const metadata: Metadata = { title: "Edit update", robots: { index: false } };

export default async function EditPostPage({ params }: PageProps<"/author/community/[id]">) {
  const { id } = await params;
  const me = await requireRole(["author", "admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: p } = await admin.from("posts").select("*").eq("id", id).maybeSingle();
  if (!p || p.author_id !== me.id) notFound();
  const { data: books } = await admin.from("books").select("id, title").eq("author_id", me.id).eq("status", "published").order("title");
  return (
    <>
      <Link href="/author/community" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-fg">
        ← Community
      </Link>
      <h1 className="mt-1 mb-5 text-[1.75rem]">{p.status === "published" ? "Edit update" : "New update"}</h1>
      <PostEditor
        id={p.id}
        status={p.status as "draft" | "published"}
        moderated={p.moderation === "visible" ? null : p.moderation}
        initial={{ body: p.body, image_alt: p.image_alt ?? "", related_book_id: p.related_book_id ?? "" }}
        imageUrl={postImageUrl(p.image_path)}
        books={books ?? []}
        publicPath={`/community/${p.id}`}
      />
    </>
  );
}
