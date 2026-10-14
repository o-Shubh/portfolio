"use client";

import { useState } from "react";
import { earnings, minimumMrp, printCost, rupees, sortedOptions, type Fees, type PrintOptions, type PrintRates } from "@/lib/pricing";
import { EarningsBreakdown } from "./EarningsBreakdown";

export type CalculatorValues = PrintOptions & { mrp: number | "" };

/**
 * Print options + MRP with a live earnings breakdown.
 * Used on the author's "Print & price" step (inside a form, fields are submitted)
 * and on the public pricing page (just a calculator).
 */
export function PrintCalculator({
  rates,
  fees,
  initial,
  disabled = false,
  sizeWarning,
}: {
  rates: PrintRates;
  fees: Fees;
  initial: CalculatorValues;
  disabled?: boolean;
  /** Optional: PDF page size, to warn if the chosen size doesn't match */
  sizeWarning?: (trimKey: string) => string | null;
}) {
  const [v, setV] = useState<CalculatorValues>(initial);
  const set = <K extends keyof CalculatorValues>(k: K, val: CalculatorValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const pagesOk = Number.isInteger(v.page_count) && v.page_count >= rates.min_pages && v.page_count <= rates.max_pages;
  const cost = pagesOk ? printCost(v, rates) : null;
  const minMrp = cost !== null ? minimumMrp(cost, fees, 1) : null;
  const mrp = typeof v.mrp === "number" ? v.mrp : 0;
  const result = cost !== null && mrp > 0 ? earnings(mrp, cost, fees) : null;
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
              MRP (₹)
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
          <p role="note" className="-mt-3 rounded-2xl bg-marigold/10 ring-1 ring-marigold/30 p-3 text-sm">
            {warning}
          </p>
        )}
        <OptionGroup label="Inside pages" name="interior" options={rates.interior} value={v.interior} onChange={(x) => set("interior", x)} />
        <OptionGroup label="Paper" name="paper" options={rates.paper} value={v.paper} onChange={(x) => set("paper", x)} />
        <OptionGroup label="Binding" name="binding" options={rates.binding} value={v.binding} onChange={(x) => set("binding", x)} />
        <OptionGroup label="Cover finish" name="cover_finish" options={rates.cover_finish} value={v.cover_finish} onChange={(x) => set("cover_finish", x)} />
      </fieldset>

      <aside className="lg:sticky lg:top-6 lg:self-start" aria-live="polite">
        <div className="card">
          <h2 className="text-lg font-semibold">Your earnings per copy</h2>
          {cost === null ? (
            <p className="mt-3 text-muted">Enter a valid page count to see the print cost.</p>
          ) : result ? (
            <div className="mt-4">
              <EarningsBreakdown e={result} />
              {result.authorEarning < 1 && (
                <p className="mt-3 text-sm font-medium text-danger">Raise the MRP to at least {rupees(minMrp!)} to earn.</p>
              )}
              <p className="mt-4 text-sm text-muted">
                Sell 100 copies: <strong className="text-fg">{rupees(Math.max(0, result.authorEarning) * 100)}</strong>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-muted">
              Print cost is <strong className="text-fg">{rupees(cost)}</strong> per copy. Enter an MRP to see your earning.
            </p>
          )}
          {rates.is_sample && <p className="mt-4 text-xs text-muted">Using sample print rates.</p>}
        </div>
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
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl bg-surface-2 ring-1 ring-transparent transition hover:ring-line px-3 has-[:checked]:ring-2 has-[:checked]:ring-marigold has-[:checked]:bg-marigold/10 has-[:disabled]:cursor-not-allowed"
          >
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
              className="h-4 w-4 accent-[#C98200]"
            />
            <span className="font-medium">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
