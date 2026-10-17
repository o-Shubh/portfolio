import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { editionUrl, isEeid } from "@/lib/eeid-format";
import { qrLabelPdf, qrOrigin, qrPng, qrSvg } from "@/lib/edition-qr";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES = { png: "image/png", svg: "image/svg+xml", pdf: "application/pdf" } as const;

/**
 * QR assets for an edition: PNG (1200 px), SVG, or a vector print-label PDF. Only the book's author or an admin
 * can download them, only for an assigned EEID, and only once the production domain is configured, so a QR
 * pointing at a preview or local address can't be printed. The code holds only the public /e/{EEID} URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ eeid: string }> }) {
  const { eeid } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "png";
  if (!isEeid(eeid) || !(format in TYPES)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  const { data: book } = await createAdminClient().from("books").select("id, author_id").eq("eeid", eeid).maybeSingle();
  // Same answer for "no such edition" and "not yours", so IDs can't be probed for ownership
  if (!book || (book.author_id !== me.id && me.role !== "admin")) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { origin, production, problem } = qrOrigin();
  if (!production) return NextResponse.json({ error: `Print downloads are off until the production domain is configured: ${problem}` }, { status: 409 });

  const url = editionUrl(origin, eeid);
  const kind = format as keyof typeof TYPES;
  const body = kind === "svg" ? Buffer.from(await qrSvg(url)) : kind === "png" ? await qrPng(url) : await qrLabelPdf(eeid, origin);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": TYPES[kind],
      "Content-Disposition": `attachment; filename="${eeid}-${kind === "pdf" ? "print-label" : "qr"}.${kind}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
