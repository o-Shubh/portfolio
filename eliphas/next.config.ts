import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every screen here depends on who
  // is logged in, so plain dynamic rendering keeps the code simple to follow.
  cacheComponents: false,
  // The share pictures read their font files at run time; make sure they're deployed with that route
  outputFileTracingIncludes: {
    "/api/book/[slug]/share-image": ["./src/assets/fonts/*.ttf"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Basic protection for every page
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The service worker must never be cached, so app updates reach phones quickly
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Book covers from Supabase Storage (local and hosted)
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
