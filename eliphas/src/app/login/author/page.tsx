import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { LoginSwitch } from "@/components/auth/LoginSwitch";
import { getCurrentProfile, ROLE_HOME } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "../LoginForm";

export const metadata: Metadata = { title: "Author login", description: "Log in to publish your book, track sales and get paid." };

/**
 * Author login: the publishing dashboard. It's the same account as the reader login (one per mobile number):
 * new numbers are set up as authors, and reader accounts are offered publishing on the same account.
 */
export default async function AuthorLoginPage({ searchParams }: PageProps<"/login/author">) {
  const { next } = await searchParams;
  const target = safeNext(next, "/author");
  const me = await getCurrentProfile();
  if (me) {
    if (!me.full_name) redirect(`/onboarding?as=author&next=${encodeURIComponent(target)}`);
    if (me.role === "reader") redirect(`/login/author/start?next=${encodeURIComponent(target)}`);
    redirect(me.role === "author" || me.role === "admin" ? target : ROLE_HOME[me.role]);
  }

  return (
    <AuthFrame audience="author">
      <LoginSwitch current="author" next={target === "/author" ? undefined : target} />
      <h1 className="text-3xl">Author login</h1>
      <p className="mt-3 text-muted">
        Publish your book, track sales and get paid. Log in or sign up with your mobile number; we&apos;ll text you a 6-digit code.
      </p>
      <LoginForm next={target} audience="author" />
      <p className="mt-6 text-center text-sm text-muted">
        Here to buy or read?{" "}
        <Link href="/login" className="font-semibold text-accent-fg hover:underline" data-testid="to-reader-login">
          Reader login
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        Already buy books with us? Use the same number: your orders and reader account stay with you.
      </p>
      <p className="mt-8 text-center text-xs text-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-fg">
          terms of use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
          privacy policy
        </Link>
        .
      </p>
    </AuthFrame>
  );
}
