import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookCover } from "@/components/BookCover";
import { getCurrentProfile } from "@/lib/auth";
import { coverUrl } from "@/lib/books";
import { canSell, MAX_QTY } from "@/lib/order-pricing";
import { paymentMode } from "@/lib/payments";
import { getPricingSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { addressDefaults } from "../address";
import { CheckoutForm } from "../CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[slug]">) {
  const { slug } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/checkout/${slug}`);
  if (!profile.full_name) redirect("/onboarding");

  const { data: book } = await createAdminClient().from("books").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!book) notFound();
  const settings = await getPricingSettings();
  const sellable = await canSell(book, settings);

  let mode: "razorpay" | "mock" | "off" = "off";
  try {
    mode = paymentMode();
  } catch {}

  return (
    <div className="container-x py-5 md:py-8">
      <Link href={`/books/${slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg md:min-h-0">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to book
      </Link>
      <h1 className="display mt-2 text-[1.875rem] md:text-4xl">Checkout</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <Lock className="h-4 w-4" aria-hidden /> Secure payment by Razorpay: UPI, cards, net banking and wallets.
      </p>

      {!sellable || mode === "off" ? (
        <div className="notice-warn mt-8">This book can&apos;t be ordered right now. Please try again later.</div>
      ) : (
        <CheckoutForm
          mode={mode}
          maxQty={MAX_QTY}
          items={[
            {
              slug: book.slug,
              title: book.title,
              author: book.author_name,
              mrp: Number(book.mrp),
              cover: <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" />,
            },
          ]}
          defaults={await addressDefaults(profile)}
        />
      )}
    </div>
  );
}
