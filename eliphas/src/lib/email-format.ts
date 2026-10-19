// Email address checks shared by forms, actions and templates. Pure.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Trimmed, lower-cased address, or null when empty. Returns "invalid" if it doesn't look like an email. */
export function parseEmail(raw: FormDataEntryValue | string | null | undefined): string | null | "invalid" {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!value) return null;
  return value.length <= 254 && EMAIL.test(value) ? value : "invalid";
}

/** Escapes text for HTML email bodies. */
export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
