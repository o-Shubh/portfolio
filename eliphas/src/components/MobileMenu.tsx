"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "./ThemeToggle";

type L = { href: string; label: string };

/** Phone menu: a full-screen sheet with large links. Closes on navigation and Escape. */
export function MobileMenu({
  links,
  account,
  showPublish,
}: {
  links: L[];
  account: L;
  showPublish: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the page changes
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full text-fg transition hover:bg-surface-2"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Rendered into <body>: the blurred header would otherwise trap a fixed panel inside it */}
      {open &&
        createPortal(
          <div
            id="mobile-menu"
            className="safe-bottom fixed inset-x-0 top-[calc(4rem+1px+env(safe-area-inset-top))] bottom-0 z-40 flex flex-col md:hidden overflow-y-auto bg-bg px-4 pt-4 pb-6"
          >
            <nav aria-label="Menu">
              <ul className="divide-y divide-line border-b border-line">
                {[...links, account].map((l) => {
                  const active =
                    pathname === l.href || pathname.startsWith(`${l.href}/`);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between py-4 font-heading text-[2rem] leading-tight tracking-tight"
                      >
                        {l.label}
                        <ArrowUpRight
                          className="h-5 w-5 text-muted"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-auto space-y-3 pt-8">
              {showPublish && (
                <Link
                  href="/login?next=/author"
                  onClick={() => setOpen(false)}
                  className="btn-primary w-full"
                >
                  Start publishing
                </Link>
              )}
              <div className="flex items-center justify-between rounded-xl px-1 text-sm text-muted">
                Appearance
                <ThemeToggle />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
