"use client";

import { useState } from "react";
import { estimateCopy, formatPaise, minimumPriceRupees, type CommissionRule } from "@/lib/commission";
import { printCost, rupees, sortedOptions, type PrintOptions, type PrintRates } from "@/lib/pricing";
import { EarningsBreakdown } from "./EarningsBreakdown";

/** A plan to show earnings for. The first one decides the lowest allowed price. */
export type CalculatorPlan = { key: string; label: string; rule: CommissionRule; note?: string };

export type CalculatorValues = PrintOptions & { mrp: number | "" };

/**
 * Print options + book price with a live earnings breakdown for one or more plans.
 * Used on the author's "Print & price" step (inside a form, fields are submitted)
 * and on the public pricing page (just a calculator).
 */
export function PrintCalculator({
  rates,
  gatewayPercent,
  plans,
  initial,
  disabled = false,
  sizeWarning,
}: {
  rates: PrintRates;
  gatewayPercent: number;
  plans: CalculatorPlan[];
  initial: CalculatorValues;
  disabled?: boolean;
  /** Optional: PDF page size, to warn if the chosen size doesn't match */
  sizeWarning?: (trimKey: string) => string | null;
}) {
  const [v, setV] = useState<CalculatorValues>(initial);
  const set = <K extends keyof CalculatorValues>(k: K, val: CalculatorValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const pagesOk = Number.isInteger(v.page_count) && v.page_count >= rates.min_pages && v.page_count <= rates.max_pages;
  const cost = pagesOk ? printCost(v, rates) : null;
  const costPaise = cost === null ? null : cost * 100;
  const minMrp = costPaise !== null ? minimumPriceRupees(costPaise, plans[0].rule, gatewayPercent) : null;
  const mrp = typeof v.mrp === "number" ? v.mrp : 0;
  const results =
    costPaise !== null && mrp > 0 ? plans.map((p) => ({ ...p, e: estimateCopy(mrp * 100, costPaise, p.rule, gatewayPercent) })) : null;
  const mine = results?.[0];
  const warning = sizeWarning?.(v.trim_size) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,360px)]">
      <fieldset disabled={disabled} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="page_count" className="label">
              Number of pages
            </label>
            <input
              id="page_count"
              name="page_count"
              type="number"
              inputMode="numeric"
              min={rates.min_pages}
              max={rates.max_pages}
              className="field"
              value={Number.isNaN(v.page_count) ? "" : v.page_count}
              onChange={(e) => set("page_count", e.target.value === "" ? NaN : Number(e.target.value))}
              aria-describedby="pages-help"
              required
            />
            <p id="pages-help" className={`mt-1 text-sm ${pagesOk || Number.isNaN(v.page_count) ? "text-muted" : "text-danger"}`}>
              Between {rates.min_pages} and {rates.max_pages}, counting blank pages.
            </p>
          </div>
          <div>
            <label htmlFor="mrp" className="label">
              Book price / MRP (₹)
            </label>
            <input
              id="mrp"
              name="mrp"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="field text-lg font-semibold"
              value={v.mrp}
              onChange={(e) => set("mrp", e.target.value === "" ? "" : Math.round(Number(e.target.value)))}
              aria-describedby="mrp-help"
              required
            />
            <p id="mrp-help" className="mt-1 text-sm text-muted">
              {minMrp !== null ? <>Lowest price you can set: {rupees(minMrp)}</> : "Enter pages first."}
            </p>
          </div>
        </div>

        <OptionGroup label="Book size" name="trim_size" options={rates.trim_sizes} value={v.trim_size} onChange={(x) => set("trim_size", x)} />
        {warning && (
          <p role="note" className="-mt-3 rounded-[var(--radius-card)] bg-accent/10 ring-1 ring-accent/30 p-3 text-sm">
            {warning}
          </p>
        )}
        <OptionGroup label="Inside pages" name="interior" options={rates.interior} value={v.interior} onChange={(x) => set("interior", x)} />
        <OptionGroup label="Paper" name="paper" options={rates.paper} value={v.paper} onChange={(x) => set("paper", x)} />
        <OptionGroup label="Binding" name="binding" options={rates.binding} value={v.binding} onChange={(x) => set("binding", x)} />
        <OptionGroup label="Cover finish" name="cover_finish" options={rates.cover_finish} value={v.cover_finish} onChange={(x) => set("cover_finish", x)} />
      </fieldset>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-live="polite">
        {cost === null ? (
          <div className="card text-muted">Enter a valid page count to see the print cost.</div>
        ) : !results ? (
          <div className="card text-muted">
            Print cost is <strong className="text-fg">{rupees(cost)}</strong> per copy. Enter a price to see your earning.
          </div>
        ) : (
          results.map((r, i) => (
            <div key={r.key} className={`card ${i === 0 ? "ring-2 ring-accent/30" : ""}`}>
              <h2 className="text-base">{r.label}</h2>
              {r.note && <p className="mt-0.5 text-xs text-muted">{r.note}</p>}
              <div className="mt-4">
                <EarningsBreakdown
                  e={r.e}
                  commissionLabel={r.rule.percent > 0 ? `Commission (${r.rule.percent}%, min ${formatPaise(r.rule.minPaise)})` : `Platform fee (${formatPaise(r.rule.minPaise)} per copy)`}
                />
              </div>
            </div>
          ))
        )}
        {mine && mine.e.authorEarningPaise < 100 && minMrp !== null && (
          <p className="text-sm font-medium text-danger">Raise the price to at least {rupees(minMrp)} so you earn on every copy.</p>
        )}
        <p className="text-xs text-muted">
          Estimates per copy. Payment charges are estimated at {gatewayPercent}% of the book price; the actual Razorpay fee
          is shared across the books and shipping in each order. Shipping is paid by the reader and is not part of your
          earnings. {rates.is_sample && "Using sample print rates."}
        </p>
      </aside>
    </div>
  );
}

function OptionGroup({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: Record<string, { label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {sortedOptions(options).map(([key, o]) => (
          <label
            key={key}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-card)] bg-surface-2 ring-1 ring-transparent transition hover:ring-line px-3 has-[:checked]:ring-2 has-[:checked]:ring-accent has-[:checked]:bg-accent/10 has-[:disabled]:cursor-not-allowed"
          >
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
              className="h-4 w-4 accent-fg"
            />
            <span className="font-medium">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
