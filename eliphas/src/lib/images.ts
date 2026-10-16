import "server-only";
import sharp, { type Sharp } from "sharp";

// Uploaded photos are checked by their actual bytes (not the file name or browser-reported type), then
// re-encoded as WebP. Re-encoding drops all metadata (EXIF, GPS, camera details).

const SIGNATURES: ((b: Buffer) => boolean)[] = [
  (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // JPEG
  (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), // PNG
  (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP", // WebP
];

type Processed = { data: Buffer; width: number; height: number } | { error: string };

async function reencode(input: Buffer, maxBytes: number, min: { width: number; height: number }, shape: (img: Sharp) => Sharp): Promise<Processed> {
  if (input.length === 0) return { error: "The file is empty." };
  if (input.length > maxBytes) return { error: `Images can be up to ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  if (!SIGNATURES.some((test) => test(input))) return { error: "Use a JPEG, PNG or WebP image." };
  try {
    const img = sharp(input, { limitInputPixels: 40_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.width || !meta.height || meta.width < min.width || meta.height < min.height) {
      return { error: `The image is too small. Use one at least ${min.width} × ${min.height} pixels.` };
    }
    const { data, info } = await shape(img.rotate()).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return { error: "We couldn't read that image. Try exporting it again as JPEG or PNG." };
  }
}

export const COVER_MAX_BYTES = 5 * 1024 * 1024;
/** Article cover: JPEG, PNG or WebP up to 5 MB, at least 300 × 200; stored at most 1600 px. */
export const processCover = (input: Buffer) =>
  reencode(input, COVER_MAX_BYTES, { width: 300, height: 200 }, (img) => img.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }));

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
/** Profile photo: cropped square around the most interesting area, 400 × 400. */
export const processAvatar = (input: Buffer) =>
  reencode(input, AVATAR_MAX_BYTES, { width: 120, height: 120 }, (img) => img.resize({ width: 400, height: 400, fit: "cover", position: sharp.strategy.attention }));
