import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Rebuild the sitemap at most once an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages: MetadataRoute.Sitemap = ["", "/books", "/pricing", "/faq"].map((p) => ({ url: `${site}${p}` }));

  // Public client without cookies: only published books are visible to it.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return pages; // keys not set yet: still build, just without book pages
  const supabase = createClient(url, key);
  const { data } = await supabase.from("books").select("slug, updated_at").eq("status", "published");
  return [
    ...pages,
    ...(data ?? []).map((b) => ({ url: `${site}/books/${b.slug}`, lastModified: b.updated_at })),
  ];
}
