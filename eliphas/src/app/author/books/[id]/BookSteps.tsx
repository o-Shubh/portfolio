"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { slug: "details", label: "Details" },
  { slug: "files", label: "Files" },
  { slug: "print", label: "Print & price" },
  { slug: "submit", label: "Submit" },
  { slug: "sample", label: "Free sample" },
];

export function BookSteps({ bookId }: { bookId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Book steps" className="mt-6 overflow-x-auto">
      <ol className="flex min-w-max gap-2 border-b border-line">
        {STEPS.map((s, i) => {
          const href = `/author/books/${bookId}/${s.slug}`;
          const active = pathname === href;
          return (
            <li key={s.slug}>
              <Link
                href={href}
                aria-current={active ? "step" : undefined}
                className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 font-medium ${
                  active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                    active ? "bg-accent text-on-accent" : "bg-surface-2"
                  }`}
                >
                  {i + 1}
                </span>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
