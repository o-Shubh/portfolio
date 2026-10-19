import type { Metadata } from "next";
import Link from "next/link";
import { Download, Share2 } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { getOwnBookOr404 } from "@/lib/author-books";
import { friendDiscountPaise } from "@/lib/referral-rules";
import { ensureReferralCode, getReferralSettings } from "@/lib/referrals";
import { bookShareLink, shareCaptions, whatsappLink } from "@/lib/share-kit";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyText } from "./CopyText";

export const metadata: Metadata = { title: "Share kit" };

const istDay = (offsetDays: number) => new Date(Date.now() + 5.5 * 3_600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);

/** Everything an author needs to promote a live book, plus how many people it reaches. */
export default async function ShareKitPage({ params }: PageProps<"/author/books/[id]/share">) {
  const { id } = await params;
  const { profile, book } = await getOwnBookOr404(id);
  if (book.status !== "published") {
    return (
      <div className="card max-w-2xl">
        <h2 className="text-xl">Share kit</h2>
        <p className="mt-2 text-muted">
          Once your book is live you&apos;ll find ready-made pictures, a QR code, captions and your book link here, with how many people view it and read the
          sample.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const settings = await getReferralSettings();
  const code = settings.enabled ? await ensureReferralCode(profile.id) : null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = bookShareLink(site, book.slug, code);
  const since = istDay(29);
  const [{ data: stats }, { data: sold }, { count: savedBy }] = await Promise.all([
    admin.from("book_stats_daily").select("day, views, sample_opens").eq("book_id", book.id).order("day"),
    admin
      .from("order_items")
      .select("quantity, orders!inner(status, paid_at)")
      .eq("book_id", book.id)
      .neq("sale_channel", "replacement")
      .not("orders.status", "in", "(pending_payment,cancelled)"),
    admin.from("wishlist").select("*", { count: "exact", head: true }).eq("book_id", book.id),
  ]);
  const recent = (stats ?? []).filter((d) => d.day >= since);
  const sum = (rows: typeof recent, k: "views" | "sample_opens") => rows.reduce((a, d) => a + d[k], 0);
  const copies = (rows: NonNullable<typeof sold>, from?: string) =>
    rows.filter((r) => !from || ((r.orders as { paid_at: string | null }).paid_at ?? "") >= from).reduce((a, r) => a + r.quantity, 0);
  const views30 = sum(recent, "views");
  const tiles = [
    { label: "Page views", value: views30, all: sum(stats ?? [], "views") },
    { label: "Sample opens", value: sum(recent, "sample_opens"), all: sum(stats ?? [], "sample_opens") },
    { label: "Copies sold", value: copies(sold ?? [], since), all: copies(sold ?? []) },
    { label: "Saved by readers", value: savedBy ?? 0, all: null },
  ];
  const captions = shareCaptions(
    {
      title: book.title,
      author: book.author_name,
      mrp: book.mrp === null ? null : Number(book.mrp),
      hasSample: Boolean(book.sample_path && book.sample_approved_at),
      inviteDiscount: code ? friendDiscountPaise(settings, "author", Number.MAX_SAFE_INTEGER) / 100 : 0,
    },
    link,
  );
  const img = (f: "square" | "story", download = false) => `/api/book/${book.slug}/share-image?f=${f}${download ? "&download=1" : ""}`;
  const qr = `/api/book/${book.slug}/share-qr${code ? `?ref=${code}` : ""}`;

  return (
    <div className="space-y-6">
      <section aria-labelledby="reach-h">
        <h2 id="reach-h" className="text-xl">
          Reach <span className="text-base font-normal text-muted">· last 30 days</span>
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="reach">
          {tiles.map((t) => (
            <div key={t.label} className="card">
              <dt className="text-sm text-muted">{t.label}</dt>
              <dd className="display mt-1 text-2xl tabular-nums">{t.value.toLocaleString("en-IN")}</dd>
              {t.all !== null && <dd className="text-xs text-muted">{t.all.toLocaleString("en-IN")} all time</dd>}
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted">
          {views30 >= 50 && copies(sold ?? [], since) > 0
            ? `About ${Math.max(1, Math.round((copies(sold ?? [], since) / views30) * 100))} in every 100 visitors bought a copy. `
            : ""}
          Views are counted once a day per device, without storing anything about visitors. Counting started when this feature launched.
        </p>
      </section>

      <section className="card space-y-3" aria-labelledby="link-h">
        <h2 id="link-h" className="text-xl">
          Your book link
        </h2>
        <p className="mono overflow-x-auto rounded-[var(--radius-control)] bg-surface-2 px-3 py-2.5 text-sm whitespace-nowrap" data-testid="share-link">
          {link}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyText text={link} label="Copy link" />
          <ShareButton path={link} title={book.title} label="Share" />
          <a href={whatsappLink(captions[0].text)} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-3 text-sm pointer-fine:min-h-9">
            WhatsApp
          </a>
        </div>
        {code && <p className="text-sm text-muted">This link counts new customers as your invites (see Invite friends).</p>}
      </section>

      <section aria-labelledby="pictures-h">
        <h2 id="pictures-h" className="text-xl">
          Pictures to post
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto]">
          {(
            [
              ["square", "Instagram and Facebook post", "1080 × 1080"],
              ["story", "Instagram and WhatsApp status", "1080 × 1920"],
            ] as const
          ).map(([f, label, size]) => (
            <figure key={f} className="card flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated on our server */}
              <img
                src={img(f)}
                alt={`${label} picture for ${book.title}`}
                className={`rounded-[var(--radius-control)] ring-1 ring-line ${f === "story" ? "mx-auto max-h-96 w-auto" : "w-full max-w-md"}`}
                loading="lazy"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{label}</span> <span className="text-muted">{size}</span>
                </span>
                <a href={img(f, true)} download className="btn-ghost min-h-11 gap-2 px-3 pointer-fine:min-h-9">
                  <Download className="h-4 w-4" aria-hidden /> Download
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="card space-y-4" aria-labelledby="captions-h">
          <h2 id="captions-h" className="text-xl">
            Captions
          </h2>
          {captions.map((c) => (
            <div key={c.label} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="text-sm whitespace-pre-line text-muted">{c.text}</p>
              <div className="flex flex-wrap gap-2">
                <CopyText text={c.text} />
                <a href={whatsappLink(c.text)} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 gap-2 px-3 text-sm pointer-fine:min-h-9">
                  <Share2 className="h-4 w-4" aria-hidden /> WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
        <figure className="card flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated on our server */}
          <img src={qr} alt={`QR code for ${book.title}`} width={200} height={200} className="h-48 w-48" />
          <figcaption className="text-sm text-muted">QR code for posters, bookmarks and book events. It opens your book link.</figcaption>
          <a href={qr} download className="btn-ghost min-h-11 gap-2 px-3 text-sm pointer-fine:min-h-9">
            <Download className="h-4 w-4" aria-hidden /> Download QR
          </a>
        </figure>
      </section>

      <p className="text-sm text-muted">
        Want more?{" "}
        <Link href="/author/analytics" className="font-medium text-fg underline underline-offset-2">
          Pro analytics
        </Link>{" "}
        adds campaign links for each place you share.
      </p>
    </div>
  );
}
