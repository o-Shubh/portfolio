import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthEntrance } from "@/components/auth/AuthEntrance";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile, ROLE_HOME } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Author login or sign up", description: "Log in or create a free author account to publish your book, track sales and get paid." };

/**
 * Author entrance (log in or sign up). Same account as the reader entrance (one per person): new accounts are
 * set up as authors, and reader accounts are offered publishing on the same account.
 */
export default async function AuthorLoginPage({ searchParams }: PageProps<"/login/author">) {
  const { next, mode, error } = await searchParams;
  const target = safeNext(next, "/author");
  const me = await getCurrentProfile();
  if (me) {
    if (!me.full_name) redirect(`/onboarding?as=author&next=${encodeURIComponent(target)}`);
    if (me.role === "reader") redirect(`/login/author/start?next=${encodeURIComponent(target)}`);
    redirect(me.role === "author" || me.role === "admin" ? target : ROLE_HOME[me.role]);
  }
  return (
    <AuthFrame audience="author">
      <AuthEntrance audience="author" mode={mode === "signup" ? "signup" : "login"} next={target} error={typeof error === "string" ? error : undefined} />
      <p className="-mt-4 text-center text-xs text-muted">Already buy books with us? Use the same number: your orders and reader account stay with you.</p>
    </AuthFrame>
  );
}
