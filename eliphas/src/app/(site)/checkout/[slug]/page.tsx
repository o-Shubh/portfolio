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
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[slug]">) {
  const { slug } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/checkout/${slug}`);
  if (!profile.full_name) redirect("/onboarding");

  const supabase = await createClient();
  const { data: book } = await supabase.from("books").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!book) notFound();
  const settings = await getPricingSettings();
  const sellable = await canSell(book, settings);

  // Pre-fill from the last order's address, or the profile
  const { data: last } = await supabase
    .from("orders")
    .select("ship_name, ship_phone, ship_line1, ship_line2, ship_city, ship_state, ship_pincode")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let mode: "razorpay" | "mock" | "off" = "off";
  try {
    mode = paymentMode();
  } catch {}

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/books/${slug}`} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to book
      </Link>
      <h1 className="mt-2 text-4xl">Checkout</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
        <Lock className="h-4 w-4" aria-hidden /> Secure payment by Razorpay: UPI, cards, net banking and wallets.
      </p>

      {!sellable || mode === "off" ? (
        <div className="card mt-8">This book can&apos;t be ordered right now. Please try again later.</div>
      ) : (
        <CheckoutForm
          mode={mode}
          maxQty={MAX_QTY}
          book={{
            slug: book.slug,
            title: book.title,
            author: book.author_name,
            mrp: Number(book.mrp),
            cover: (
              <BookCover title={book.title} author={book.author_name} slug={book.slug} src={coverUrl(book.cover_path)} size="sm" />
            ),
          }}
          defaults={{
            ship_name: last?.ship_name ?? profile.full_name ?? "",
            ship_phone: (last?.ship_phone ?? profile.phone ?? "").slice(-10),
            ship_line1: last?.ship_line1 ?? "",
            ship_line2: last?.ship_line2 ?? "",
            ship_city: last?.ship_city ?? profile.city ?? "",
            ship_state: last?.ship_state ?? profile.state ?? "",
            ship_pincode: last?.ship_pincode ?? profile.pincode ?? "",
          }}
        />
      )}
    </div>
  );
}
