import "server-only";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { checkPublicOrigin, editionUrl, QR_PRINT } from "@/lib/eeid-format";

// QR codes for edition pages: generated here on the server (no external QR service or redirect),
// black on white, error correction M, four-module quiet zone, no logo. The code holds only the public URL.

const OPTS = { errorCorrectionLevel: "M" as const, margin: QR_PRINT.quietZoneModules, color: { dark: "#000000", light: "#ffffff" } };

/**
 * Where QR codes point. Production printing needs PUBLIC_SITE_ORIGIN; without it we can still show a clearly
 * labelled preview (using the site address this server runs on) but downloads are switched off.
 */
export function qrOrigin(): { origin: string; production: boolean; problem?: string } {
  const check = checkPublicOrigin(process.env.PUBLIC_SITE_ORIGIN);
  if (check.ok) return { origin: check.origin, production: true };
  const fallback = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return { origin: fallback, production: false, problem: check.problem };
}

export const qrSvg = (url: string) => QRCode.toString(url, { ...OPTS, type: "svg" });
export const qrPng = (url: string) => QRCode.toBuffer(url, { ...OPTS, type: "png", width: QR_PRINT.pngPixels });

const MM = 72 / 25.4;

/**
 * A vector print label: the QR (30 mm including its quiet zone), the EEID and "Scan to explore this book".
 * Modules are drawn as filled squares, so it stays sharp at any print size.
 */
export async function qrLabelPdf(eeid: string, origin: string) {
  const url = editionUrl(origin, eeid);
  const qr = QRCode.create(url, { errorCorrectionLevel: OPTS.errorCorrectionLevel });
  const count = qr.modules.size;
  const total = count + QR_PRINT.quietZoneModules * 2;
  const qrSize = QR_PRINT.recommendedMm * MM;
  const cell = qrSize / total;
  const width = 50 * MM;
  const height = 46 * MM;

  const doc = await PDFDocument.create();
  doc.setTitle(`${eeid} QR label`);
  doc.setSubject(`QR code for ${url}`);
  doc.setCreator("Eliphas Indicus Publications");
  doc.setProducer("Eliphas Indicus Publications");
  const page = doc.addPage([width, height]);
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  const left = (width - qrSize) / 2;
  const top = height - 3 * MM; // 3 mm margin above the QR's own quiet zone
  // One filled path (rows of merged dark runs), so there are no hairline seams between modules
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; ) {
      if (!qr.modules.get(r, c)) { c++; continue; }
      let end = c;
      while (end < count && qr.modules.get(r, end)) end++;
      const x = (c + QR_PRINT.quietZoneModules) * cell;
      const y = (r + QR_PRINT.quietZoneModules) * cell;
      d += `M${x.toFixed(3)} ${y.toFixed(3)}h${((end - c) * cell).toFixed(3)}v${cell.toFixed(3)}h${(-(end - c) * cell).toFixed(3)}z`;
      c = end;
    }
  }
  // drawSvgPath uses SVG coordinates (y down) from the given top-left corner
  page.drawSvgPath(d, { x: left, y: top, color: rgb(0, 0, 0) });
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const centre = (text: string, font: typeof bold, size: number, y: number) =>
    page.drawText(text, { x: (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color: rgb(0, 0, 0) });
  const textTop = top - qrSize;
  centre(eeid, bold, 9, textTop - 4.5 * MM);
  centre("Scan to explore this book", regular, 7.5, textTop - 8.5 * MM);
  return Buffer.from(await doc.save());
}
