/** Only allow redirects to a page on this site (no //evil.example or full URLs). */
export const safeNext = (next: unknown, fallback: string) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
