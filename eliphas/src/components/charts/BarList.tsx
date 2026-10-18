"use client";

import { useState } from "react";

export type BarRow = { key: string; label: string; sub?: string; value: number; detail?: string };

/**
 * Ranked horizontal bars (e.g. copies by city). Names on the left, bar, and the
 * value at the bar's tip. Hover / focus shows the extra detail.
 */
export function BarList({ rows, caption }: { rows: BarRow[]; caption: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <ul aria-label={caption} className="space-y-2.5">
      {rows.map((r) => {
        const share = total ? Math.round((r.value / total) * 100) : 0;
        const on = active === r.key;
        return (
          <li
            key={r.key}
            tabIndex={0}
            aria-label={`${r.label}${r.sub ? `, ${r.sub}` : ""}: ${r.value}, ${share}% of the total${r.detail ? `, ${r.detail}` : ""}`}
            onPointerEnter={() => setActive(r.key)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(r.key)}
            onBlur={() => setActive(null)}
            className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 rounded-[var(--radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-accent sm:grid-cols-[minmax(0,11rem)_1fr]"
          >
            <span className="min-w-0 truncate text-sm">
              <span className="font-semibold">{r.label}</span>
              {r.sub && <span className="text-muted"> · {r.sub}</span>}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`h-3 rounded-r-[4px] bg-chart transition-opacity ${active && !on ? "opacity-45" : ""}`}
                style={{ width: `${Math.max(2, (r.value / max) * 82)}%` }}
                aria-hidden
              />
              <span className="shrink-0 text-sm font-semibold mono">
                {r.value}
                {on && (
                  <span className="ml-2 font-normal text-muted">
                    {share}%{r.detail ? ` · ${r.detail}` : ""}
                  </span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
