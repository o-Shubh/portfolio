"use client";

import { usePathname, useRouter } from "next/navigation";
import type { CommunityResult } from "@/app/actions/community";

/**
 * Handles "log in first": sends the reader to OTP login (or account setup) and brings them back to
 * this page with ?intent=…, so the like/save/follow/comment they started happens on return.
 * Returns an error message to show, or null when the action worked or the reader is being redirected.
 */
export function useGate() {
  const router = useRouter();
  const pathname = usePathname();
  return (res: CommunityResult, intent: string): string | null => {
    if ("ok" in res) return null;
    const back = encodeURIComponent(`${pathname}?intent=${intent}`);
    if (res.login) {
      router.push(`/login?next=${back}`);
      return null;
    }
    if (res.onboarding) {
      router.push(`/onboarding?next=${back}`);
      return null;
    }
    return res.error;
  };
}

/** Removes ?intent=… from the address bar once it has been handled, so a refresh doesn't repeat it. */
export function useClearIntent() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.replace(pathname, { scroll: false });
}
