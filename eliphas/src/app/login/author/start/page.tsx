import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { becomeAuthor } from "@/app/actions/profile";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile, ROLE_HOME } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Start publishing", robots: { index: false } };

/** A reader who used the author login: offer publishing on the same account (nothing is lost). */
export default async function StartPublishingPage({ searchParams }: PageProps<"/login/author/start">) {
  const { next } = await searchParams;
  const target = safeNext(next, "/author");
  const me = await getCurrentProfile();
  if (!me) redirect(`/login/author?next=${encodeURIComponent(target)}`);
  if (!me.full_name) redirect(`/onboarding?as=author&next=${encodeURIComponent(target)}`);
  if (me.role === "author" || me.role === "admin") redirect(target);

  if (me.role !== "reader") {
    return (
      <AuthFrame audience="author">
        <h1 className="text-3xl">Author tools aren&apos;t available here</h1>
        <p className="mt-3 text-muted">This number is set up as a {me.role} account. To publish, sign up with a different mobile number, or contact us.</p>
        <Link href={ROLE_HOME[me.role]} className="btn-primary mt-6 inline-flex">
          Back to my dashboard
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame audience="author">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent-fg">
        <PenLine className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-3xl">Start publishing, {me.full_name.split(" ")[0]}?</h1>
      <p className="mt-3 text-muted">
        Your number is registered as a reader. Turn on author tools for this same account: your orders, saved items and community profile stay
        exactly as they are, and you can still shop as usual.
      </p>
      <form action={becomeAuthor} className="mt-6">
        <button type="submit" className="btn-primary w-full" data-testid="start-publishing">
          Start publishing
        </button>
      </form>
      <Link href="/account" className="btn-ghost mt-3 w-full">
        Not now, take me to my reader account
      </Link>
      <p className="mt-6 text-xs text-muted">
        Publishing is free. A Verified author badge is separate: you can apply for it later from Account → Author verification.
      </p>
    </AuthFrame>
  );
}
