import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { COVER_BUCKET, coverUrl, isRestricted, processCover } from "@/lib/articles";
import { createAdminClient } from "@/lib/supabase/admin";

async function ownArticle(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || !["author", "admin"].includes(profile.role) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("articles").select("id, author_id, cover_path, moderation").eq("id", id).maybeSingle();
  return data && data.author_id === profile.id ? { profile, article: data } : null;
}

/** Uploads a cover: checked by its bytes, re-encoded as WebP without metadata, stored publicly. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownArticle(id);
  if (!own) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  if (own.article.moderation === "removed" || (await isRestricted(own.profile.id))) return NextResponse.json({ error: "You can't change this article." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  const processed = await processCover(Buffer.from(await file.arrayBuffer()));
  if ("error" in processed) return NextResponse.json({ error: processed.error }, { status: 400 });

  const admin = createAdminClient();
  const path = `${own.profile.id}/${id}/${crypto.randomUUID()}.webp`;
  const { error } = await admin.storage.from(COVER_BUCKET).upload(path, processed.data, { contentType: "image/webp", upsert: false });
  if (error) return NextResponse.json({ error: "Could not store the image. Try again." }, { status: 500 });
  await admin.from("articles").update({ cover_path: path }).eq("id", id);
  if (own.article.cover_path) await admin.storage.from(COVER_BUCKET).remove([own.article.cover_path]);
  revalidatePath(`/author/articles/${id}`);
  return NextResponse.json({ url: coverUrl(path), width: processed.width, height: processed.height });
}

/** Removes the cover image. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownArticle(id);
  if (!own) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  const admin = createAdminClient();
  if (own.article.cover_path) await admin.storage.from(COVER_BUCKET).remove([own.article.cover_path]);
  await admin.from("articles").update({ cover_path: null, cover_alt: null }).eq("id", id);
  revalidatePath(`/author/articles/${id}`);
  return NextResponse.json({ ok: true });
}
