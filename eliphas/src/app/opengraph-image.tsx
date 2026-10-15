import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Eliphas Indicus Publications: books printed on demand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview picture shown when someone shares a link to the site. */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/logo-full-light.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#13223c", color: "#ffffff", padding: 72 }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- rendered to an image, not HTML */}
        <img src={src} height={150} style={{ height: 150 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, lineHeight: 1.1, fontWeight: 600, maxWidth: 960 }}>Books printed fresh, just for you.</div>
          <div style={{ marginTop: 24, fontSize: 30, color: "#cb9436" }}>Publish your book · Print on demand · Delivered to your door</div>
        </div>
      </div>
    ),
    size,
  );
}
