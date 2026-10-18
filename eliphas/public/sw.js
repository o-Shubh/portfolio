/*
 * Eliphas Indicus service worker.
 * Kept deliberately small and safe:
 *  - Static files (/_next/static, icons, fonts) are cached for speed. Their names change
 *    with every deploy, so a cached copy is never out of date.
 *  - Pages are always fetched fresh from the network. If the phone is offline, a
 *    friendly "you're offline" page is shown instead.
 *  - Nothing private is ever cached: no pages, no API calls, no Supabase or Razorpay requests.
 */
const VERSION = "v2";
const STATIC_CACHE = `eliphas-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  ) || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Page navigations: network only, offline page as a fallback
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static files: cache first, then network (and remember the result)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
  // Everything else (data, images from Supabase, payments) goes straight to the network.
});
