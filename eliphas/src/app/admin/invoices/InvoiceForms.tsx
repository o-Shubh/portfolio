"use client";

import { useState, useTransition } from "react";
import { issueMissingInvoices, saveInvoicing, type InvoiceActionState } from "@/app/actions/invoices";
import { FormMessage } from "@/components/FormMessage";
import type { InvoicingSettings } from "@/lib/invoices";
import { offlineSafe, useFormAction } from "@/lib/use-form-action";

export function InvoicingForm({ settings, states }: { settings: InvoicingSettings; states: string[] }) {
  const [state, onSubmit, pending, { onChange }] = useFormAction(saveInvoicing, { warnUnsaved: true });
  return (
    <form onSubmit={onSubmit} onChange={onChange} className="card mt-4 space-y-4" data-testid="invoicing-form">
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block font-medium">Payments are live (real money)</span>
          <span className="block text-sm text-muted">
            Turn on when you switch Razorpay to live keys. Until then every invoice is a test document (TST numbers), so test payments never use up real
            invoice numbers.
          </span>
        </span>
        <input type="checkbox" role="switch" name="live_payments" className="switch mt-1" defaultChecked={settings.live_payments} />
      </label>
      <div>
        <label htmlFor="seller_state" className="label">
          State of your registered address
        </label>
        <select id="seller_state" name="seller_state" defaultValue={settings.seller_state} className="field">
          <option value="">Choose…</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <p className="hint">Used until you add a GSTIN; after that the GSTIN&apos;s state is used.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="book_hsn" label="HSN code for printed books" value={settings.book_hsn} hint="4901 is printed books" />
        <Field name="book_gst_percent" label="GST on books (%)" value={String(settings.book_gst_percent)} hint="Included in the book price" />
        <Field name="shipping_gst_percent" label="GST on shipping (%)" value={String(settings.shipping_gst_percent)} hint="Included in the shipping charge" />
        <Field name="service_sac" label="SAC code for author services" value={settings.service_sac} />
        <Field name="subscription_sac" label="SAC code for Author Pro" value={settings.subscription_sac} />
      </div>
      <div>
        <label htmlFor="footer_note" className="label">
          Note printed on every invoice <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="footer_note" name="footer_note" rows={2} maxLength={500} defaultValue={settings.footer_note} className="field" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function Field({ name, label, value, hint }: { name: string; label: string; value: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} defaultValue={value} inputMode="decimal" className="field" />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function IssueMissingButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<InvoiceActionState>(undefined);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn-primary" disabled={pending} onClick={() => start(async () => setState(await offlineSafe(issueMissingInvoices())))}>
        {pending ? "Issuing…" : "Issue missing documents"}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
