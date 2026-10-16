import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { AVATAR_BUCKET, avatarUrl } from "@/lib/avatars";
import { processAvatar } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sets your profile photo: checked by its bytes, cropped square, re-encoded as WebP without metadata. */
export async function POST(request: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  const processed = await processAvatar(Buffer.from(await file.arrayBuffer()));
  if ("error" in processed) return NextResponse.json({ error: processed.error }, { status: 400 });

  const admin = createAdminClient();
  const path = `${me.id}/${crypto.randomUUID()}.webp`;
  const { error } = await admin.storage.from(AVATAR_BUCKET).upload(path, processed.data, { contentType: "image/webp", upsert: false });
  if (error) return NextResponse.json({ error: "Could not store the photo. Try again." }, { status: 500 });
  await admin.from("profiles").update({ avatar_path: path }).eq("id", me.id);
  if (me.avatar_path) await admin.storage.from(AVATAR_BUCKET).remove([me.avatar_path]);
  revalidatePath("/", "layout");
  return NextResponse.json({ url: avatarUrl(path) });
}

/** Removes your profile photo (initials are shown instead). */
export async function DELETE() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const admin = createAdminClient();
  if (me.avatar_path) await admin.storage.from(AVATAR_BUCKET).remove([me.avatar_path]);
  await admin.from("profiles").update({ avatar_path: null }).eq("id", me.id);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
