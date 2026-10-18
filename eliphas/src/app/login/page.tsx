import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile } from "@/lib/auth";
import { LoginSwitch } from "@/components/auth/LoginSwitch";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Reader login", description: "Log in to buy books, read samples, save articles and join the community." };

/** Reader login: buying, reading and the community. Authors have their own entrance at /login/author. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNext(next, "/dashboard");
  if (await getCurrentProfile()) redirect(target);

  return (
    <AuthFrame audience="reader">
      <LoginSwitch current="reader" next={target === "/dashboard" ? undefined : target} />
      <h1 className="text-3xl">Reader login</h1>
      <p className="mt-3 text-muted">Buy books, read samples, save articles and join the community. Log in or sign up with your mobile number; we&apos;ll text you a 6-digit code.</p>
      <LoginForm next={target} audience="reader" />
      <p className="mt-6 text-center text-sm text-muted">
        Want to publish a book?{" "}
        <Link href="/login/author" className="font-semibold text-accent-fg hover:underline" data-testid="to-author-login">
          Author login
        </Link>
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
