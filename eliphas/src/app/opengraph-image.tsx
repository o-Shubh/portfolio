import { ImageResponse } from "next/og";

export const alt = "Eliphas Indicus Publications: self-publish your book in print";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview picture shown when someone shares a link to the site. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0a", color: "#fafaf9", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fafaf9", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, paddingLeft: 18 }}>
              <div style={{ width: 28, height: 8, borderRadius: 2, background: "#0a0a0a" }} />
              <div style={{ width: 21, height: 8, borderRadius: 2, background: "#ff5a1f" }} />
              <div style={{ width: 28, height: 8, borderRadius: 2, background: "#0a0a0a" }} />
            </div>
            <div style={{ fontSize: 36, fontFamily: "serif" }}>Eliphas Indicus</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, lineHeight: 1.02, fontFamily: "serif", letterSpacing: -2, maxWidth: 900 }}>
              Publish the book you were meant to write.
            </div>
            <div style={{ marginTop: 28, fontSize: 30, color: "#a8a29e" }}>Print on demand · No stock · No upfront cost</div>
          </div>
        </div>
        <div style={{ width: 16, background: "#ff5a1f", borderRadius: 8, marginLeft: 48 }} />
      </div>
    ),
    size,
  );
}
