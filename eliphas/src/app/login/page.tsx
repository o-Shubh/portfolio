import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthEntrance } from "@/components/auth/AuthEntrance";
import { AuthFrame } from "@/components/AuthFrame";
import { getCurrentProfile } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Reader login or sign up", description: "Log in or create a free account to buy books, read samples, save articles and join the community." };

/** Reader entrance (log in or sign up). Authors have their own entrance at /login/author; same account either way. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, mode, error } = await searchParams;
  const target = safeNext(next, "/dashboard");
  if (await getCurrentProfile()) redirect(target);
  return (
    <AuthFrame audience="reader">
      <AuthEntrance audience="reader" mode={mode === "signup" ? "signup" : "login"} next={target} error={typeof error === "string" ? error : undefined} />
    </AuthFrame>
  );
}
