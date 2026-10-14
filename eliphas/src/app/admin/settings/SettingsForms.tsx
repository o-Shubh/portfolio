"use client";

import { useActionState } from "react";
import { saveRatesJson, saveSettingsForm } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import { RATE_FIELDS, sortedOptions, type PricingSettings, type RateGroup } from "@/lib/pricing";

const GROUP_TITLE: Record<RateGroup, string> = {
  trim_sizes: "Book sizes",
  interior: "Inside pages",
  paper: "Paper",
  binding: "Binding (includes cover printing)",
  cover_finish: "Cover finish",
};
const FIELD_LABEL: Record<string, string> = {
  page_multiplier: "Per-page multiplier",
  width_in: "Width (in)",
  height_in: "Height (in)",
  per_page: "₹ per page",
  per_page_extra: "Extra ₹ per page",
  spine_mm_per_page: "Spine mm per page",
  base: "₹ per copy",
  extra: "Extra ₹ per copy",
};

export function SettingsForm({ settings }: { settings: PricingSettings }) {
  const [state, action, pending] = useActionState(saveSettingsForm, undefined);
  const { rates, fees, shipping } = settings;

  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Fees and shipping</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Num name="platform_fee_per_copy" label="Platform fee (₹ per copy)" value={fees.platform_fee_per_copy} />
          <Num name="gateway_percent" label="Razorpay charge (%)" value={fees.gateway_percent} />
          <Num name="gateway_gst_percent" label="GST on Razorpay charge (%)" value={fees.gateway_gst_percent} />
          <Num name="shipping_flat" label="Shipping per order (₹)" value={shipping.flat} />
          <Num name="shipping_free_above" label="Free shipping from (₹)" value={shipping.free_above} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">General</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="is_sample" defaultChecked={rates.is_sample} className="h-5 w-5 accent-[#C98200]" />
          <span>
            <span className="font-semibold">These are sample rates</span>
            <span className="block text-sm text-muted">Shows a &quot;sample rates&quot; notice on the pricing page. Untick once printer rates are final.</span>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Num name="min_pages" label="Minimum pages" value={rates.min_pages} step="1" />
          <Num name="max_pages" label="Maximum pages" value={rates.max_pages} step="1" />
          <Num name="cover_bleed_in" label="Cover bleed (in)" value={rates.cover_bleed_in ?? 0.125} />
        </div>
        <p className="text-sm text-muted">
          Print cost per copy = binding + finish + pages × (inside ₹ per page + paper extra) × size multiplier, rounded up.
        </p>
      </section>

      {(Object.keys(RATE_FIELDS) as RateGroup[]).map((group) => (
        <section key={group} className="card">
          <h2 className="text-lg font-semibold">{GROUP_TITLE[group]}</h2>
          <div className="mt-3 space-y-4">
            {sortedOptions(rates[group] as Record<string, { label: string }>).map(([key, opt]) => (
              <fieldset key={key} className="grid gap-3 border-t border-line pt-4 first:border-0 first:pt-0 sm:grid-cols-4">
                <legend className="sr-only">{opt.label}</legend>
                <div>
                  <label className="label" htmlFor={`${group}|${key}|label`}>
                    Label <span className="font-normal text-muted">({key})</span>
                  </label>
                  <input id={`${group}|${key}|label`} name={`${group}|${key}|label`} defaultValue={opt.label} className="field" required />
                </div>
                {RATE_FIELDS[group].map((f) => (
                  <Num
                    key={f}
                    name={`${group}|${key}|${f}`}
                    label={FIELD_LABEL[f]}
                    value={(opt as unknown as Record<string, number | undefined>)[f] ?? 0}
                  />
                ))}
              </fieldset>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-20 z-10 rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur md:bottom-4">
        <FormMessage state={state} />
        <button type="submit" className="btn-accent mt-2" disabled={pending}>
          {pending ? "Saving…" : "Save all changes"}
        </button>
      </div>
    </form>
  );
}

export function RatesJsonForm({ json }: { json: string }) {
  const [state, action, pending] = useActionState(saveRatesJson, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label htmlFor="json" className="sr-only">
        Print rates JSON
      </label>
      <textarea id="json" name="json" rows={18} defaultValue={json} spellCheck={false} className="field py-3 font-mono text-sm" />
      <FormMessage state={state} />
      <button type="submit" className="btn-ghost" disabled={pending}>
        {pending ? "Checking…" : "Check and save JSON"}
      </button>
    </form>
  );
}

function Num({ name, label, value, step = "any" }: { name: string; label: string; value: number; step?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type="number" inputMode="decimal" step={step} min="0" defaultValue={value} className="field" required />
    </div>
  );
}
