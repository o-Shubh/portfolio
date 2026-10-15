import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  if (await getCurrentProfile()) redirect("/dashboard");

  // Only allow redirects within this site
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <AuthFrame>
      <h1 className="text-5xl">Welcome</h1>
      <p className="mt-3 text-muted">Log in or create an account with your mobile number. We&apos;ll text you a 6-digit code.</p>
      <LoginForm next={safeNext} />
      <p className="mt-8 text-center text-xs text-muted">By continuing you agree to our terms and privacy policy.</p>
    </AuthFrame>
  );
}
