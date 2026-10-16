import { ArrowLeft, BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { articlePath } from "@/lib/article-format";
import { coverUrl } from "@/lib/articles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArticleEditor } from "./ArticleEditor";

export const metadata: Metadata = { title: "Edit article", robots: { index: false } };

export default async function EditArticlePage({ params }: PageProps<"/author/articles/[id]">) {
  const profile = await requireRole(["author", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: a } = await admin.from("articles").select("*").eq("id", id).maybeSingle();
  if (!a || a.author_id !== profile.id) notFound(); // drafts are private to their author
  const { data: books } = await admin.from("books").select("id, title").eq("author_id", profile.id).eq("status", "published").order("title");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/author/articles" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden /> My articles
        </Link>
        {a.first_published_at && (
          <Link href={`/author/articles/${a.id}/stats`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold underline">
            <BarChart3 className="h-4 w-4" aria-hidden /> Readership
          </Link>
        )}
      </div>
      <h1 className="mt-1 mb-5 text-2xl md:text-3xl">{a.title || "New article"}</h1>
      <ArticleEditor
        id={a.id}
        status={a.status as "draft" | "published" | "unpublished"}
        path={articlePath(a)}
        coverUrl={coverUrl(a.cover_path)}
        books={books ?? []}
        moderated={a.moderation === "visible" ? null : a.moderation}
        moderationReason={a.moderation_reason}
        initial={{
          title: a.title,
          excerpt: a.excerpt,
          language: a.language,
          topic: a.topic ?? "",
          tags: a.tags.join(", "),
          body_md: a.body_md,
          cover_alt: a.cover_alt ?? "",
          related_book_id: a.related_book_id ?? "",
          rights: Boolean(a.rights_confirmed_at),
        }}
      />
    </>
  );
}
