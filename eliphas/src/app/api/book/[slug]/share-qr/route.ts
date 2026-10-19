import QRCode from "qrcode";
import { getPublishedBook } from "@/lib/books";
import { isReferralCode } from "@/lib/referral-rules";
import { bookShareLink } from "@/lib/share-kit";

/** QR code (PNG) for a live book's share link, for posters, bookmarks and events. `?ref=CODE` uses an invite link. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const book = await getPublishedBook(slug);
  if (!book) return new Response("Not found", { status: 404 });
  const ref = url.searchParams.get("ref") ?? "";
  const link = bookShareLink(process.env.NEXT_PUBLIC_SITE_URL ?? url.origin, book.slug, isReferralCode(ref) ? ref : null);
  const png = await QRCode.toBuffer(link, { errorCorrectionLevel: "M", margin: 4, width: 1024, color: { dark: "#000000", light: "#ffffff" } });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "Content-Disposition": `attachment; filename="${book.slug}-qr.png"` },
  });
}
