import { BadgeIndianRupee, Languages, Truck } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Login / onboarding layout: brand panel on large screens, form on the right. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <aside className="relative m-3 hidden overflow-hidden rounded-[2rem] bg-ink p-10 text-paper lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-marigold/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-deodar/70 blur-3xl" />
        </div>
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative mt-auto">
          <h2 className="max-w-md text-5xl leading-[1.05]">
            Every great Indian story deserves a <span className="pr-[0.08em] text-marigold italic">printed</span> home.
          </h2>
          <ul className="mt-10 space-y-4 text-paper/80">
            {[
              { icon: BadgeIndianRupee, t: "₹0 to publish — pay only when a copy sells" },
              { icon: Languages, t: "Hindi and English, Devanagari done right" },
              { icon: Truck, t: "Printed in India, delivered across India" },
            ].map((i) => (
              <li key={i.t} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <i.icon className="h-4 w-4" aria-hidden />
                </span>
                {i.t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex flex-col px-4 py-6">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Logo />
          </span>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
