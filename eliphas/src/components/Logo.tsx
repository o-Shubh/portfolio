/* eslint-disable @next/next/no-img-element -- small static brand images, sized by CSS */
import Link from "next/link";

/**
 * The Eliphas Indicus logo (elephant + wordmark).
 * `onDark`: always the white version, for the navy header and footer.
 * Otherwise navy on light screens and white in dark mode.
 */
export function Logo({ href = "/", onDark = false, className = "h-10" }: { href?: string; onDark?: boolean; className?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label="Eliphas Indicus Publications, home">
      {onDark ? (
        <img src="/brand/logo-full-light.png" alt="" className={`w-auto ${className}`} />
      ) : (
        <>
          <img src="/brand/logo-full.png" alt="" className={`w-auto dark:hidden ${className}`} />
          <img src="/brand/logo-full-light.png" alt="" className={`hidden w-auto dark:block ${className}`} />
        </>
      )}
    </Link>
  );
}

/** Just the elephant, for small spaces (install card, avatars). */
export function LogoMark({ className = "h-8 w-8", onDark = false }: { className?: string; onDark?: boolean }) {
  return onDark ? (
    <img src="/brand/logo-mark-light.png" alt="" className={`object-contain ${className}`} />
  ) : (
    <>
      <img src="/brand/logo-mark.png" alt="" className={`object-contain dark:hidden ${className}`} />
      <img src="/brand/logo-mark-light.png" alt="" className={`hidden object-contain dark:block ${className}`} />
    </>
  );
}
