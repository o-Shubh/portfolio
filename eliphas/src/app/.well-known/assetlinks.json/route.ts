/**
 * Digital Asset Links: proves to Android that the Play Store app and this website belong together,
 * so the app opens full-screen without a browser bar. Set in Vercel:
 *   ANDROID_PACKAGE_NAME   e.g. app.eliphas.twa (from PWABuilder or Android Studio)
 *   ANDROID_SHA256_CERT    the app signing key's SHA-256 fingerprint (Play Console → App integrity);
 *                          several can be separated by commas
 */
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME;
  const prints = (process.env.ANDROID_SHA256_CERT ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const body =
    pkg && prints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: prints },
          },
        ]
      : [];
  return Response.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
