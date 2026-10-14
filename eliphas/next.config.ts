import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every screen here depends on who
  // is logged in, so plain dynamic rendering keeps the code simple to follow.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
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
