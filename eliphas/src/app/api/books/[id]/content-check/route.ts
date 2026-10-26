import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { runManuscriptCheck } from "@/lib/manuscript-check";
import { createAdminClient } from "@/lib/supabase/admin";

// Reading a long PDF can take a while
export const maxDuration = 60;

/** Runs the seven content checks on a book's current manuscript. The book's author or an admin. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const { data: book } = await createAdminClient().from("books").select("author_id").eq("id", id).maybeSingle();
  if (!book || (book.author_id !== me.id && me.role !== "admin")) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const res = await runManuscriptCheck(id);
  if (!("id" in res)) return NextResponse.json(res, { status: 400 }); // a stored check has an id; otherwise it's { error }
  revalidatePath(`/author/books/${id}/submit`);
  revalidatePath(`/admin/books/${id}`);
  return NextResponse.json({ ok: true, overall: res.overall });
}
