import { BookOpen, PenLine } from "lucide-react";
import Link from "next/link";

/** Reader / author entrance switch at the top of both login pages. Same account either way. */
export function LoginSwitch({ current, next, mode = "login" }: { current: "reader" | "author"; next?: string; mode?: "login" | "signup" }) {
  // Keeps the chosen mode (log in / sign up) when switching entrance
  const q = (n?: string) => {
    const parts = [mode === "signup" ? "mode=signup" : "", n ? `next=${encodeURIComponent(n)}` : ""].filter(Boolean);
    return parts.length ? `?${parts.join("&")}` : "";
  };
  const tabs = [
    { key: "reader", label: "Reader", icon: BookOpen, href: `/login${current === "reader" ? q(next) : q()}` },
    { key: "author", label: "Author", icon: PenLine, href: `/login/author${current === "author" ? q(next) : q()}` },
  ] as const;
  return (
    <nav aria-label="Choose login" className="segmented mb-8 grid w-full grid-cols-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className="segment gap-2 pointer-fine:min-h-9"
          data-testid={`login-switch-${t.key}`}
        >
          <t.icon className="h-4 w-4" aria-hidden /> {t.label}
        </Link>
      ))}
    </nav>
  );
}
