import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Header for the public website. */
export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {profile ? (
            <Link href="/dashboard" className="btn-primary">
              My account
            </Link>
          ) : (
            <Link href="/login" className="btn-primary">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
