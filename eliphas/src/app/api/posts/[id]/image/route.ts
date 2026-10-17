import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { isRestricted } from "@/lib/articles";
import { processCover } from "@/lib/images";
import { POST_BUCKET, postImageUrl } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";

async function ownPost(id: string) {
  const me = await getCurrentProfile();
  if (!me || !me.full_name || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("posts").select("id, author_id, image_path, moderation").eq("id", id).maybeSingle();
  return data && data.author_id === me.id ? { me, post: data } : null;
}

/** One image per update: checked by its bytes, re-encoded as WebP without metadata, stored publicly. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownPost(id);
  if (!own) return NextResponse.json({ error: "Update not found." }, { status: 404 });
  if (own.post.moderation === "removed" || (await isRestricted(own.me.id))) return NextResponse.json({ error: "You can't change this update." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  const processed = await processCover(Buffer.from(await file.arrayBuffer()));
  if ("error" in processed) return NextResponse.json({ error: processed.error }, { status: 400 });
  const admin = createAdminClient();
  const path = `${own.me.id}/${id}/${crypto.randomUUID()}.webp`;
  const { error } = await admin.storage.from(POST_BUCKET).upload(path, processed.data, { contentType: "image/webp", upsert: false });
  if (error) return NextResponse.json({ error: "Could not store the image. Try again." }, { status: 500 });
  await admin.from("posts").update({ image_path: path }).eq("id", id);
  if (own.post.image_path) await admin.storage.from(POST_BUCKET).remove([own.post.image_path]);
  revalidatePath(`/community/${id}`);
  return NextResponse.json({ url: postImageUrl(path) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownPost(id);
  if (!own) return NextResponse.json({ error: "Update not found." }, { status: 404 });
  const admin = createAdminClient();
  if (own.post.image_path) await admin.storage.from(POST_BUCKET).remove([own.post.image_path]);
  await admin.from("posts").update({ image_path: null, image_alt: null }).eq("id", id);
  revalidatePath(`/community/${id}`);
  return NextResponse.json({ ok: true });
}
