"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Column = { key: string; label: string; longLabel: string; value: number; valueText: string; detail?: string };

/** Axis top as 4 equal whole-number steps (copies can't be fractions): 5 → 8, 27 → 40. */
function niceMax(v: number) {
  const raw = Math.max(1, Math.ceil(v / 4));
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((m) => m >= raw && Number.isInteger(m))!;
  return step * 4;
}

/**
 * Single-series column chart (e.g. copies sold per month).
 * - Bars ≤ 24px wide, 4px rounded top, square at the baseline.
 * - Hover / tap / keyboard focus shows a tooltip; the peak bar is labelled.
 * - The same numbers are in a table below for screen readers and exact reading.
 */
export function ColumnChart({
  data,
  height = 220,
  caption,
}: {
  data: Column[];
  height?: number;
  caption: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 22, right: 4, bottom: 26, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, band * 0.62);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  const labelEvery = band < 34 ? 2 : 1;

  // Column with a 4px rounded top and a square base
  const column = (x: number, top: number, w: number) => {
    const h = pad.top + innerH - top;
    if (h <= 0) return "";
    const r = Math.min(4, h, w / 2);
    return `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`;
  };

  const a = active !== null ? data[active] : null;
  const ax = active !== null ? pad.left + band * active + band / 2 : 0;

  return (
    <figure className="m-0">
      <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={caption}
          aria-describedby={tableId}
          className="block max-w-full overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular-nums">
                {t >= 1000 ? `${Math.round(t / 100) / 10}K` : t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2;
            return (
              <g key={d.key}>
                {/* the bar */}
                <path
                  d={column(cx - barW / 2, y(d.value), barW)}
                  fill="var(--chart)"
                  opacity={active === null || active === i ? 1 : 0.45}
                  className="transition-opacity"
                />
                {/* month label */}
                {i % labelEvery === (data.length - 1) % labelEvery && (
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={i === active ? "var(--fg)" : "var(--muted)"}>
                    {d.label}
                  </text>
                )}
                {/* only the peak is labelled; the tooltip and table carry the rest */}
                {i === peak && d.value > 0 && active === null && (
                  <text x={cx} y={y(d.value) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--fg)" className="tabular-nums">
                    {d.value}
                  </text>
                )}
                {/* large, invisible hit area: easier to hover and tap than the thin bar */}
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.longLabel}: ${d.valueText}${d.detail ? `, ${d.detail}` : ""}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="cursor-pointer outline-none focus-visible:stroke-marigold focus-visible:stroke-2"
                />
              </g>
            );
          })}
        </svg>
        {a && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-surface px-3 py-2 text-sm whitespace-nowrap shadow-lift ring-1 ring-line"
            style={{ left: Math.min(Math.max(ax, 70), width - 70), top: Math.max(y(a.value) - 8, 40) }}
          >
            <p className="font-semibold tabular-nums">{a.valueText}</p>
            {a.detail && <p className="text-muted tabular-nums">{a.detail}</p>}
            <p className="text-xs text-muted">{a.longLabel}</p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-muted hover:text-fg">Show as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table id={tableId} className="w-full text-left tabular-nums">
            <caption className="sr-only">{caption}</caption>
            <tbody className="divide-y divide-line">
              {data.map((d) => (
                <tr key={d.key}>
                  <th scope="row" className="py-1.5 font-medium">
                    {d.longLabel}
                  </th>
                  <td className="py-1.5 text-right">{d.valueText}</td>
                  {d.detail !== undefined && <td className="py-1.5 text-right text-muted">{d.detail}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
