"use client";

import { useState, useTransition } from "react";
import {
  adminCancelService,
  adminNoteService,
  issueQuote,
  recordDeliverable,
  sendBackForRequirements,
  sendForReview,
  startServiceWork,
  type AdminMoneyState,
} from "@/app/actions/admin-money";
import { FormMessage } from "@/components/FormMessage";
import { PrivateUpload } from "@/components/PrivateUpload";
import { QC_ITEMS } from "@/lib/services";
import { useFormAction } from "@/lib/use-form-action";

export function QuoteForm({
  orderId,
  kind,
  defaults,
}: {
  orderId: string;
  kind: "initial" | "additional";
  defaults: { price: string; gst: number; revisions: number; deliverables: string[]; hint: string };
}) {
  const [state, onSubmit, pending] = useFormAction(issueQuote.bind(null, orderId));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm text-muted">{defaults.hint}</p>
      <div className="grid gap-3 sm:grid-cols-4">
        <L label="Price (₹, before GST)">
          <input name="price" defaultValue={defaults.price} className="field" inputMode="decimal" />
        </L>
        <L label="GST %">
          <input name="gst_percent" defaultValue={defaults.gst} className="field" />
        </L>
        <L label="Revisions included">
          <input name="revisions" defaultValue={defaults.revisions} className="field" inputMode="numeric" />
        </L>
        <L label="Deliver by">
          <input name="delivery_by" type="date" className="field" />
        </L>
      </div>
      <L label="Deliverables (one per line)">
        <textarea name="deliverables" rows={4} defaultValue={defaults.deliverables.join("\n")} className="field py-2.5" />
      </L>
      <L label="Notes to the author (required if the price differs from the catalogue)">
        <textarea name="notes" rows={2} className="field py-2.5" />
      </L>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Send quote
      </button>
    </form>
  );
}

export function SendBack({ orderId }: { orderId: string }) {
  const [state, onSubmit, pending] = useFormAction(sendBackForRequirements.bind(null, orderId));
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <L label="Ask the author for missing information">
        <input name="note" className="field" />
      </L>
      <FormMessage state={state} />
      <button type="submit" className="btn-ghost" disabled={pending}>
        Send back
      </button>
    </form>
  );
}

export function StartWork({ orderId }: { orderId: string }) {
  const [msg, setMsg] = useState<AdminMoneyState>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary" disabled={pending} onClick={() => start(async () => setMsg(await startServiceWork(orderId)))}>
        Start work
      </button>
      <FormMessage state={msg} />
    </div>
  );
}

export function Deliver({ orderId, needsQc }: { orderId: string; needsQc: boolean }) {
  const [state, onSubmit, pending] = useFormAction(sendForReview.bind(null, orderId));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <PrivateUpload bucket="service-files" folder={`${orderId}/draft`} label="Upload draft / preview" onUploaded={(f) => recordDeliverable(orderId, { ...f, kind: "draft" })} />
        <PrivateUpload bucket="service-files" folder={`${orderId}/final`} label="Upload final file" onUploaded={(f) => recordDeliverable(orderId, { ...f, kind: "final" })} />
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        {needsQc && (
          <fieldset className="rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-semibold">Quality check (required for final print files)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {QC_ITEMS.map((i) => (
                <label key={i.key} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name={`qc_${i.key}`} className="mt-0.5 h-4 w-4 accent-fg" /> {i.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <L label="Message to the author">
          <textarea name="note" rows={2} className="field py-2.5" />
        </L>
        <FormMessage state={state} />
        <button type="submit" className="btn-accent" disabled={pending}>
          Send to author for review
        </button>
      </form>
    </div>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [state, onSubmit, pending] = useFormAction(adminNoteService.bind(null, orderId));
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <L label="Add a note (visible to the author)">
        <textarea name="note" rows={2} className="field py-2.5" />
      </L>
      <FormMessage state={state} />
      <button type="submit" className="btn-ghost" disabled={pending}>
        Add note
      </button>
    </form>
  );
}

export function AdminCancel({ orderId, paidLabel }: { orderId: string; paidLabel: string | null }) {
  const [state, onSubmit, pending] = useFormAction(adminCancelService.bind(null, orderId));
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <L label="Reason (the author sees it)">
        <input name="reason" className="field" />
      </L>
      {paidLabel && (
        <L label={`Refund amount in ₹ (paid ${paidLabel}; work not started = full refund automatically)`}>
          <input name="refund" className="field" inputMode="decimal" placeholder="0" />
        </L>
      )}
      <FormMessage state={state} />
      <button type="submit" className="btn bg-danger text-white" disabled={pending}>
        Cancel order
      </button>
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
