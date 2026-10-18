// Where to send someone right after they sign in (phone code or Google). No imports, so it is unit tested directly.

export type Audience = "reader" | "author";

/**
 * New accounts set up their name first; on the author entrance they're set up as authors.
 * An existing reader who used the author entrance is offered publishing on the same account.
 */
export function postLoginPath(profile: { full_name: string | null; role: string } | null, audience: Audience, next: string): string {
  if (!profile?.full_name) {
    if (audience === "author") return `/onboarding?as=author&next=${encodeURIComponent(next)}`;
    return next !== "/dashboard" ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
  }
  if (audience === "author" && profile.role === "reader") return `/login/author/start?next=${encodeURIComponent(next)}`;
  return next;
}
