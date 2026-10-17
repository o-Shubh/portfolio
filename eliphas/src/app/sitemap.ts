import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { articlePath } from "@/lib/article-format";

// Rebuild the sitemap at most once an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages: MetadataRoute.Sitemap = ["", "/books", "/authors", "/community", "/articles", "/pricing", "/faq", "/contact", "/terms", "/privacy", "/refunds", "/shipping"].map((p) => ({ url: `${site}${p}` }));

  // Public client without cookies: only published books are visible to it.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return pages; // keys not set yet: still build, just without book pages
  const supabase = createClient(url, key);
  const [{ data }, { data: articles }, { data: authors }] = await Promise.all([
    supabase.from("books").select("slug, updated_at").eq("status", "published"),
    // Row Level Security only shows the public published, visible articles (never drafts or hidden ones)
    supabase.from("articles").select("short_id, slug, updated_at").eq("status", "published").eq("moderation", "visible").limit(5000),
    supabase.from("public_authors").select("handle").limit(5000),
  ]);
  return [
    ...pages,
    ...(data ?? []).map((b) => ({ url: `${site}/books/${b.slug}`, lastModified: b.updated_at })),
    ...(articles ?? []).map((a) => ({ url: `${site}${articlePath(a)}`, lastModified: a.updated_at })),
    ...(authors ?? []).filter((a) => a.handle).map((a) => ({ url: `${site}/authors/${a.handle}` })),
  ];
}
