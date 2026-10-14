import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentProfile } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  if (await getCurrentProfile()) redirect("/dashboard");

  // Only allow redirects within this site
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card">
          <h1 className="text-2xl font-semibold">Log in or sign up</h1>
          <p className="mt-1 text-muted">We&apos;ll send a 6-digit code to your mobile number.</p>
          <LoginForm next={safeNext} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>
    </main>
  );
}
