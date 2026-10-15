import { Check } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Login / onboarding layout: form on the left, a bold brand panel on large screens. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[1fr_1.05fr]">
      <div className="safe-top flex flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside className="relative m-3 hidden overflow-hidden rounded-2xl bg-accent p-12 text-on-accent lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <p className="relative text-xs font-medium tracking-[0.12em] uppercase opacity-70">Eliphas Indicus Publications</p>
        <div className="relative mt-auto">
          <h2 className="max-w-lg text-6xl leading-[1] tracking-[-0.03em]">
            Every story deserves a <em>printed</em> home.
          </h2>
          <ul className="mt-10 space-y-3 text-lg">
            {["Free to publish — pay only when a copy sells", "You keep every right to your work", "Printed on demand, never out of stock"].map(
              (t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-paper">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {t}
                </li>
              ),
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}
