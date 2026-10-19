import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { coverUrl, getPublishedBook } from "@/lib/books";

const SIZES = { square: { width: 1080, height: 1080 }, story: { width: 1080, height: 1920 } } as const;
const NAVY = "#17214a";
const GOLD = "#e9a31a";

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));
// The image renderer can't shape Devanagari correctly (vowel signs land in the wrong place), so Hindi titles and
// names are left to the book's own cover rather than drawn wrongly.
const drawable = (text: string) => !/[\u0900-\u097F]/.test(text);

/**
 * A ready-to-post picture of a live book for Instagram, WhatsApp status and Facebook: square (1080×1080) or story
 * (1080×1920), with the cover, title, author and price. `?download=1` saves it as a file.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("f") === "story" ? "story" : "square";
  const book = await getPublishedBook(slug);
  if (!book) return new Response("Not found", { status: 404 });
  const [regular, semibold] = await Promise.all([font("Inter-Regular.ttf"), font("Inter-SemiBold.ttf")]);
  const showTitle = drawable(book.title);
  const showAuthor = drawable(book.author_name);
  const cover = coverUrl(book.cover_path);
  const host = (process.env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const price = book.mrp !== null ? `₹${Number(book.mrp).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : null;
  const story = format === "story";
  const coverW = story ? 600 : 440;
  const coverH = Math.round(coverW * 1.5);
  const titleSize = book.title.length > 40 ? (story ? 64 : 52) : story ? 84 : 68;

  const coverEl = cover ? (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered to an image, not HTML
    <img
      src={cover}
      width={coverW}
      height={coverH}
      style={{ width: coverW, height: coverH, objectFit: "cover", borderRadius: 12, boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}
    />
  ) : (
    <div
      style={{
        width: coverW,
        height: coverH,
        borderRadius: 12,
        background: "#2a376e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        fontSize: 44,
        textAlign: "center",
      }}
    >
      {showTitle ? book.title : ""}
    </div>
  );
  const text = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: story ? "center" : "flex-start",
        textAlign: story ? "center" : "left",
        maxWidth: story ? 900 : 480,
      }}
    >
      <div style={{ fontSize: 26, letterSpacing: 4, color: GOLD, fontWeight: 600 }}>NEW BOOK</div>
      {showTitle && <div style={{ fontSize: titleSize, lineHeight: 1.15, fontWeight: 600, marginTop: 18 }}>{book.title}</div>}
      {showAuthor && <div style={{ fontSize: story ? 40 : 34, marginTop: 18, color: "#d6dbef" }}>{`by ${book.author_name}`}</div>}
      {price && <div style={{ fontSize: story ? 56 : 48, fontWeight: 600, marginTop: 28 }}>{price}</div>}
      <div style={{ fontSize: story ? 30 : 26, marginTop: 16, color: "#d6dbef" }}>Printed fresh · Delivered across India</div>
    </div>
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: NAVY,
        color: "#ffffff",
        padding: story ? "120px 90px" : 72,
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", flex: 1, flexDirection: story ? "column" : "row", alignItems: "center", justifyContent: "center", gap: story ? 70 : 64 }}>
        {coverEl}
        {text}
      </div>
      <div style={{ display: "flex", justifyContent: story ? "center" : "space-between", alignItems: "center", fontSize: 28, marginTop: 40 }}>
        <div style={{ display: "flex", background: GOLD, color: NAVY, fontWeight: 600, borderRadius: 999, padding: "14px 30px" }}>Order now</div>
        {!story && <div style={{ color: "#d6dbef" }}>{host}</div>}
      </div>
      {story && <div style={{ display: "flex", justifyContent: "center", fontSize: 30, color: "#d6dbef", marginTop: 24 }}>{host}</div>}
    </div>,
    {
      ...SIZES[format],
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: semibold, weight: 600, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600",
        ...(url.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="${book.slug}-${format}.png"` } : {}),
      },
    },
  );
}
