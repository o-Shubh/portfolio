import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { formatPaise } from "@/lib/commission";
import { pendingInvite } from "@/lib/referrals";

export const metadata: Metadata = { title: "You're invited", robots: { index: false } };

/** Where an invite link lands: who invited you and what you get, then sign up or browse. */
export default async function JoinPage() {
  const [invite, me] = await Promise.all([pendingInvite(), getCurrentProfile()]);
  if (!invite) redirect("/");
  return (
    <div className="container-x flex justify-center py-10 md:py-16">
      <div className="card w-full max-w-lg text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/15 text-accent">
          <Gift className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="display mt-4 text-[1.875rem] leading-tight">{invite.firstName ? `${invite.firstName} invited you` : "You're invited"}</h1>
        {invite.discountPaise > 0 ? (
          <p className="mt-2 text-muted">
            Create your account and get <strong className="text-fg">{formatPaise(invite.discountPaise)} off</strong> your first order
            {invite.minOrderPaise > 0 && ` of ${formatPaise(invite.minOrderPaise)} or more`}. Every book is printed fresh for you.
          </p>
        ) : (
          <p className="mt-2 text-muted">Discover books by independent Indian authors, printed fresh for every reader.</p>
        )}
        {me ? (
          <>
            <p className="mt-4 text-sm text-muted">Invites are for new accounts. You&apos;re already signed in.</p>
            <Link href="/books" className="btn-accent mt-6 min-h-12 w-full text-base">
              Browse books
            </Link>
          </>
        ) : (
          <div className="mt-6 grid gap-3">
            <Link href="/login?mode=signup&next=/books" className="btn-accent min-h-12 text-base">
              Create your account
            </Link>
            <Link href="/books" className="btn-ghost min-h-12 text-base">
              Browse books first
            </Link>
          </div>
        )}
        <p className="mt-5 text-xs text-muted">
          The invite is saved on this device for 30 days.{" "}
          <Link href="/referral-terms" className="underline underline-offset-2">
            Invite terms
          </Link>
        </p>
      </div>
    </div>
  );
}
