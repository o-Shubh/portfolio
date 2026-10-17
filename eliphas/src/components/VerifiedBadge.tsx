import { BadgeCheck } from "lucide-react";

/**
 * "Verified Author": our team checked that this profile belongs to the author.
 * It doesn't endorse their opinions or guarantee a book's quality, and it is separate from Author Pro.
 */
export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  const title = "Verified author: our team confirmed this profile belongs to the author. Not an endorsement of opinions or books.";
  return compact ? (
    <BadgeCheck className="inline h-4 w-4 shrink-0 text-accent-fg" role="img" aria-label="Verified author" focusable="false">
      <title>{title}</title>
    </BadgeCheck>
  ) : (
    <span className="badge bg-accent/10 text-accent-fg" title={title}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified author
    </span>
  );
}

export const VERIFIED_NOTE = "The Verified Author badge means our team confirmed this profile belongs to the author. It isn't an endorsement of their opinions or a guarantee of book quality, and it's separate from Author Pro.";
