// Eliphas Edition IDs (EEID) and the public origin printed in QR codes. No imports, so it is unit tested directly.
// An EEID is our own publishing identifier. It is not an ISBN and not proof that a physical copy is genuine.

export const EEID_RE = /^EEID-\d{4}-\d{6,}$/;
export const isEeid = (s: unknown): s is string => typeof s === "string" && s.length <= 30 && EEID_RE.test(s);

/** Hosts that must never be printed in a QR code: local machines, preview deployments and storage. */
const NOT_PRODUCTION = [/^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^\[?::1\]?$/, /\.local$/, /\.vercel\.app$/, /\.netlify\.app$/, /\.supabase\.(co|in)$/, /^10\./, /^192\.168\./];

export type OriginCheck = { ok: true; origin: string } | { ok: false; problem: string };

/**
 * Validates the production site address (PUBLIC_SITE_ORIGIN) used in QR codes: https, a real domain,
 * no path, query or port tricks. Returns the normalised origin ("https://example.com").
 */
export function checkPublicOrigin(raw: string | undefined | null): OriginCheck {
  const value = (raw ?? "").trim();
  if (!value) return { ok: false, problem: "PUBLIC_SITE_ORIGIN isn't set." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, problem: "PUBLIC_SITE_ORIGIN isn't a valid web address." };
  }
  if (url.protocol !== "https:") return { ok: false, problem: "PUBLIC_SITE_ORIGIN must start with https://." };
  if (url.username || url.password || url.port) return { ok: false, problem: "PUBLIC_SITE_ORIGIN can't include a port or login." };
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) return { ok: false, problem: "PUBLIC_SITE_ORIGIN must be just the domain, with no path." };
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || NOT_PRODUCTION.some((re) => re.test(host))) return { ok: false, problem: `${host} is a local, preview or storage address, not your production domain.` };
  return { ok: true, origin: `https://${host}` };
}

/** The permanent public page for an edition. */
export const editionPath = (eeid: string) => `/e/${eeid}`;
export const editionUrl = (origin: string, eeid: string) => `${origin.replace(/\/$/, "")}${editionPath(eeid)}`;

/** Print guidance shown next to downloads (printed size is separate from export resolution). */
export const QR_PRINT = { recommendedMm: 30, minimumMm: 25, pngPixels: 1200, quietZoneModules: 4 } as const;
