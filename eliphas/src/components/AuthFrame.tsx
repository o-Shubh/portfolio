import { Check } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const PANELS = {
  author: {
    title: "Every story deserves a printed home.",
    points: ["Free to publish — pay only when a copy sells", "You keep every right to your work", "Printed on demand, never out of stock"],
  },
  reader: {
    title: "Books worth holding, printed for you.",
    points: ["Read a free sample before you buy", "Printed fresh and delivered across India", "Follow authors and join the conversation"],
  },
} as const;

/** Login / onboarding layout: form on the left, a bold brand panel (for readers or authors) on large screens. */
export function AuthFrame({ children, audience = "author" }: { children: React.ReactNode; audience?: "reader" | "author" }) {
  const panel = PANELS[audience];
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[1fr_1.05fr]">
      <div className="safe-top flex flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo className="h-11" />
          <ThemeToggle />
        </div>
        <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center py-12 outline-none">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside className="relative m-3 hidden overflow-hidden rounded-2xl bg-navy p-12 text-white lg:flex lg:flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
        <img src="/brand/logo-full-light.png" alt="" className="relative h-16 w-auto self-start" />
        <div className="relative mt-auto">
          <h2 className="max-w-lg text-5xl leading-[1.1] font-semibold">
            {panel.title}
          </h2>
          <ul className="mt-10 space-y-3 text-lg text-white/85">
            {panel.points.map(
              (t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 text-white">
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
