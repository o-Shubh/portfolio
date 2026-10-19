import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Password", robots: { index: false } };

/** Choose a new password: after a "forgot password" link, or from Settings. Only for accounts that sign in with email. */
export default async function PasswordPage() {
  await requireRole(["reader", "author", "printer", "admin"]);
  const { data } = await (await createClient()).auth.getUser();
  const email = data.user?.identities?.some((i) => i.provider === "email") ? data.user.email : null;
  return (
    <>
      <PageHeader title="Password" intro={email ? `For signing in with ${email}.` : undefined} />
      {email ? (
        <PasswordForm />
      ) : (
        <p className="card max-w-lg text-muted">
          This account signs in with a mobile number or Google, so it doesn&apos;t use a password.{" "}
          <Link href="/account/profile" className="font-semibold text-fg underline underline-offset-2">
            Back to Settings
          </Link>
        </p>
      )}
    </>
  );
}
