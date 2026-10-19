import "server-only";
import { articlePath } from "@/lib/article-format";
import { queueEmail } from "@/lib/email";
import { digestEmail, type DigestSections } from "@/lib/email-templates";
import { getBusiness } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

/** Monday in India, when the weekly email goes out. */
export const isDigestDay = (now = new Date()) => new Date(now.getTime() + 5.5 * 3_600_000).getUTCDay() === 1;

/** ISO-like week key (India time), so each person gets at most one weekly email per week. */
function weekKey(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  const day = (ist.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/**
 * Sends the opt-in weekly email to everyone who asked for it and has an email address: new books, articles and
 * community posts from people they follow, and price drops on books they saved, from the last 7 days. Nobody gets
 * an email in a week with nothing new. Safe to run again the same week (one email per person per week).
 */
export async function sendWeeklyDigests(limit = 500) {
  const admin = createAdminClient();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const week = weekKey();
  const business = (await getBusiness()).legal_name || "Eliphas Indicus";
  const { data: people } = await admin
    .from("profiles")
    .select("id, full_name, email, digest_token")
    .eq("weekly_digest", true)
    .not("email", "is", null)
    .limit(limit);
  const result = { sent: 0, nothing_new: 0 };
  for (const p of people ?? []) {
    const { data: follows } = await admin.from("follows").select("author_id").eq("follower_id", p.id);
    const authors = (follows ?? []).map((f) => f.author_id);
    const none = { data: [] as never[] };
    const [books, articles, posts, saved] = await Promise.all([
      authors.length
        ? admin.from("books").select("title, slug, author_name").eq("status", "published").in("author_id", authors).gte("published_at", since).limit(10)
        : none,
      authors.length
        ? admin
            .from("articles")
            .select("title, short_id, slug, author:profiles!articles_author_id_fkey(full_name)")
            .eq("status", "published")
            .eq("moderation", "visible")
            .in("author_id", authors)
            .gte("first_published_at", since)
            .limit(10)
        : none,
      authors.length
        ? admin
            .from("posts")
            .select("id, body, author:profiles!posts_author_id_fkey(full_name)")
            .eq("status", "published")
            .eq("moderation", "visible")
            .in("author_id", authors)
            .gte("first_published_at", since)
            .limit(5)
        : none,
      admin.from("notifications").select("title, link, kind").eq("user_id", p.id).in("kind", ["price_drop", "back_on_sale"]).gte("created_at", since).limit(10),
    ]);
    const sections: DigestSections = {
      savedBooks: (saved.data ?? []).map((n) => ({ title: n.title, url: `${site}${n.link}` })),
      books: (books.data ?? []).map((b) => ({ title: b.title, by: b.author_name, url: `${site}/books/${b.slug}` })),
      articles: (articles.data ?? []).map((a) => ({
        title: a.title,
        by: (a.author as { full_name: string | null } | null)?.full_name ?? undefined,
        url: `${site}${articlePath(a)}`,
      })),
      posts: (posts.data ?? []).map((x) => ({
        title: x.body.replace(/\s+/g, " ").slice(0, 100) + (x.body.length > 100 ? "…" : ""),
        by: (x.author as { full_name: string | null } | null)?.full_name ?? undefined,
        url: `${site}/community/${x.id}`,
      })),
    };
    const mail = digestEmail({
      siteUrl: site,
      businessName: business,
      name: (p.full_name ?? "").split(/\s+/)[0] || "there",
      unsubscribeUrl: `${site}/unsubscribe?t=${p.digest_token}`,
      sections,
    });
    if (!mail) {
      result.nothing_new++;
      continue;
    }
    await queueEmail({ kind: "weekly_digest", to: p.email!, ...mail, dedupeKey: `digest:${p.id}:${week}`, userId: p.id });
    result.sent++;
  }
  return result;
}
