"use client";

import { createPlanVersion, saveTermsAndTax } from "@/app/actions/admin-money";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function PlanVersionForm() {
  const [state, onSubmit, pending] = useFormAction(createPlanVersion);
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="text-lg">New plan version</h2>
      <p className="text-sm text-muted">
        Creates a new version that applies from its effective date. Past orders and paid Pro periods keep the version they were made with.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Plan">
          <select name="plan" className="field">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </Field>
        <Field label="Pro price per month (₹, before GST)">
          <input name="price" className="field" inputMode="decimal" placeholder="299" />
        </Field>
        <Field label="GST % (subscription and commission)">
          <input name="gst_percent" className="field" inputMode="decimal" defaultValue="18" />
        </Field>
        <Field label="Commission %">
          <input name="commission_percent" className="field" inputMode="decimal" />
        </Field>
        <Field label="Minimum commission per copy (₹)">
          <input name="commission_min" className="field" inputMode="decimal" />
        </Field>
        <Field label="Pro creative credits per month">
          <input name="credits" className="field" inputMode="numeric" defaultValue="3" />
        </Field>
        <Field label="Effective from">
          <input name="effective_from" type="datetime-local" className="field" />
        </Field>
      </div>
      <Field label="Reason for the change (kept in the audit log)">
        <input name="note" className="field" />
      </Field>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Save new version
      </button>
    </form>
  );
}

export function TermsTaxForm({
  terms,
  tax,
}: {
  terms: { version: string; effective_from: string; summary: string };
  tax: { platform_gst_percent: number; gst_registered: boolean; withholding_configured: boolean; review_note?: string };
}) {
  const [state, onSubmit, pending] = useFormAction(saveTermsAndTax);
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="text-lg">Author terms and tax</h2>
      <p className="text-sm text-muted">
        Changing the terms version asks authors who haven&apos;t accepted it to accept before publishing new books. Existing books keep the terms the author
        accepted; nothing changes silently.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Terms version">
          <input name="terms_version" className="field" defaultValue={terms.version} />
        </Field>
        <Field label="Terms effective from">
          <input name="terms_effective_from" type="date" className="field" defaultValue={terms.effective_from} />
        </Field>
        <Field label="Platform GST % (proposed)">
          <input name="platform_gst_percent" className="field" defaultValue={tax.platform_gst_percent} />
        </Field>
      </div>
      <Field label="Summary shown to authors">
        <textarea name="terms_summary" rows={2} className="field py-2.5" defaultValue={terms.summary} />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="gst_registered" defaultChecked={tax.gst_registered} className="h-5 w-5 accent-fg" />
        GST registered (receipts become tax invoices when a GSTIN is also set in Settings)
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="withholding_configured" defaultChecked={tax.withholding_configured} className="h-5 w-5 accent-fg" />
        TDS/TCS reviewed by an accountant (no withholding is calculated by the app yet)
      </label>
      <Field label="Accountant review note">
        <textarea name="review_note" rows={2} className="field py-2.5" defaultValue={tax.review_note ?? ""} />
      </Field>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Save
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
