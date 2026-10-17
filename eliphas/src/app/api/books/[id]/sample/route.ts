import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkUploadedSample, ownSampleBook, storeDraft } from "@/lib/sample-drafts";

/** The author uploads their own sample PDF. It's stored privately as a draft until they approve it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await ownSampleBook(id);
  if (!own) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a PDF file." }, { status: 400 });
  const checked = await checkUploadedSample(new Uint8Array(await file.arrayBuffer()), own.book);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  const res = await storeDraft(own.book, checked.data, { source: "upload", from: null, to: null });
  if ("error" in res) return NextResponse.json(res, { status: 500 });
  revalidatePath(`/author/books/${id}/sample`);
  return NextResponse.json({ ok: true, pages: checked.pages });
}
