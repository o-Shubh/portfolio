"use client";

import { useFormAction } from "@/lib/use-form-action";
import { saveBusiness, saveRatesJson, saveSettingsForm } from "@/app/actions/admin";
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
  const [state, onSubmit, pending] = useFormAction(saveSettingsForm);
  const { rates, fees } = settings;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-lg">Payment gateway estimate</h2>
        <p className="text-sm text-muted">
          Used to estimate payment charges before an order exists. The actual Razorpay fee replaces it when a payment is confirmed. Commission is set in{" "}
          <a href="/admin/plans" className="underline">Plans</a>; shipping in <a href="/admin/shipping" className="underline">Shipping</a>.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Num name="gateway_percent" label="Razorpay charge (%)" value={fees.gateway_percent} />
          <Num name="gateway_gst_percent" label="GST on Razorpay charge (%)" value={fees.gateway_gst_percent} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg">General</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="is_sample" defaultChecked={rates.is_sample} className="h-5 w-5 accent-fg" />
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
          <h2 className="text-lg">{GROUP_TITLE[group]}</h2>
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

      <div className="sticky bottom-20 z-10 rounded-[var(--radius-card)] bg-surface ring-1 ring-line/95 p-4 backdrop-blur md:bottom-4">
        <FormMessage state={state} />
        <button type="submit" className="btn-primary mt-2" disabled={pending}>
          {pending ? "Saving…" : "Save all changes"}
        </button>
      </div>
    </form>
  );
}

export function RatesJsonForm({ json }: { json: string }) {
  const [state, onSubmit, pending] = useFormAction(saveRatesJson);
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <label htmlFor="json" className="sr-only">
        Print rates JSON
      </label>
      <textarea id="json" name="json" rows={18} defaultValue={json} spellCheck={false} className="field py-3 mono text-sm" />
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

type BusinessField = { key: string; label: string; hint?: string; required?: boolean; multiline?: boolean };

export function BusinessForm({ fields, values }: { fields: BusinessField[]; values: Record<string, string> }) {
  const [state, onSubmit, pending] = useFormAction(saveBusiness);
  return (
    <form onSubmit={onSubmit} className="card space-y-4" id="business">
      <div>
        <h2 className="text-lg">Business details</h2>
        <p className="mt-1 text-sm text-muted">
          Shown on the Contact, Terms, Privacy, Refund and Shipping pages. Razorpay checks these before approving live
          payments.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
            <label htmlFor={`biz-${f.key}`} className="label">
              {f.label} {!f.required && <span className="font-normal text-muted">(optional)</span>}
            </label>
            {f.multiline ? (
              <textarea id={`biz-${f.key}`} name={f.key} rows={3} defaultValue={values[f.key]} className="field py-2.5" />
            ) : (
              <input id={`biz-${f.key}`} name={f.key} defaultValue={values[f.key]} className="field" />
            )}
            {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
          </div>
        ))}
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save business details"}
      </button>
    </form>
  );
}
