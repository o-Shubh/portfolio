"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { createPortal } from "react-dom";
import { ThemeToggle } from "./ThemeToggle";

type L = { href: string; label: string };

const MORE: L[] = [
  { href: "/books?lang=en", label: "English books" },
  { href: "/books?lang=hi", label: "Hindi books" },
  { href: "/faq", label: "Help and FAQ" },
  { href: "/contact", label: "Contact us" },
  { href: "/refunds", label: "Refunds and cancellations" },
];

/** Phone menu: a full-screen sheet. Closes on navigation and Escape. Rendered into <body>. */
export function MobileMenu({ links, account, showPublish }: { links: L[]; account: L; showPublish: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the page changes
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const sheet = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDialogFocus(open, sheet, close);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const row = (l: L, big = false) => (
    <li key={l.href}>
      <Link
        href={l.href}
        onClick={() => setOpen(false)}
        className={`flex items-center justify-between px-4 ${big ? "py-4 text-base font-semibold" : "py-3.5 text-[0.9375rem]"}`}
      >
        {l.label}
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
      </Link>
    </li>
  );

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-full text-fg transition hover:bg-surface-2"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div id="mobile-menu" ref={sheet} role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-bg md:hidden">
            <div className="safe-top border-b border-line bg-surface text-fg">
              <div className="flex h-16 items-center justify-between px-4">
                <span className="text-lg font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <nav aria-label="Menu" className="safe-bottom flex-1 overflow-y-auto pb-6">
              <ul className="mt-3 divide-y divide-line bg-surface shadow-soft">{[...links, account].map((l) => row(l, true))}</ul>
              <p className="px-4 pt-6 pb-2 text-xs font-semibold tracking-wider text-muted uppercase">More</p>
              <ul className="divide-y divide-line bg-surface shadow-soft">{MORE.map((l) => row(l))}</ul>
              <div className="space-y-4 px-4 pt-6">
                {showPublish && (
                  <Link href="/login?next=/author" onClick={() => setOpen(false)} className="btn-primary w-full">
                    Publish your book
                  </Link>
                )}
                <div className="flex items-center justify-between text-sm text-muted">
                  Appearance
                  <ThemeToggle />
                </div>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
