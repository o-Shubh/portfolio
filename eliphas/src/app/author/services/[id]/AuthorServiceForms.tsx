"use client";

import { useState, useTransition } from "react";
import {
  acceptQuote,
  approveDelivery,
  cancelMyService,
  confirmServicePayment,
  declineQuote,
  payServiceQuote,
  recordRequirementFile,
  requestBundleUpgrade,
  requestExtraWork,
  requestRevision,
  saveRequirements,
  type ServiceActionState,
} from "@/app/actions/services";
import { FormMessage } from "@/components/FormMessage";
import { PayButton } from "@/components/PayButton";
import { PrivateUpload } from "@/components/PrivateUpload";
import { REQUIREMENT_FIELDS } from "@/lib/services";
import { useFormAction } from "@/lib/use-form-action";

export function RequirementsForm({
  orderId,
  required,
  values,
  rightsConfirmed,
}: {
  orderId: string;
  required: string[];
  values: Record<string, string>;
  rightsConfirmed: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(saveRequirements.bind(null, orderId));
  const fields = REQUIREMENT_FIELDS.filter((f) => required.includes(f.key) || ["bio", "output_formats", "complexity", "printer_spec"].includes(f.key));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label htmlFor={`req-${f.key}`} className="label">
              {f.label} {!required.includes(f.key) && <span className="font-normal text-muted">(optional)</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea id={`req-${f.key}`} name={f.key} rows={3} defaultValue={values[f.key] ?? ""} className="field py-2.5" />
            ) : f.type === "select" ? (
              <select id={`req-${f.key}`} name={f.key} defaultValue={values[f.key] ?? ""} className="field">
                <option value="">Choose</option>
                {f.options!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input id={`req-${f.key}`} name={f.key} type={f.type === "number" ? "number" : "text"} defaultValue={values[f.key] ?? ""} className="field" />
            )}
            {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="rights" defaultChecked={rightsConfirmed} className="mt-0.5 h-5 w-5 accent-fg" />
        <span>I own or have permission to use everything I upload (text, images, fonts, logos) for this book and its promotion.</span>
      </label>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="submit" value="1" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Submit for review"}
        </button>
        <button type="submit" className="btn-ghost" disabled={pending}>
          Save draft
        </button>
      </div>
    </form>
  );
}

export function RequirementUploads({ orderId }: { orderId: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PrivateUpload
        bucket="service-files"
        folder={`${orderId}/requirement`}
        label="Manuscript or existing cover files"
        onUploaded={(f) => recordRequirementFile(orderId, { ...f, kind: "requirement" })}
      />
      <PrivateUpload
        bucket="service-files"
        folder={`${orderId}/reference`}
        accept="images"
        maxMb={10}
        label="Reference images (optional)"
        onUploaded={(f) => recordRequirementFile(orderId, { ...f, kind: "reference" })}
      />
    </div>
  );
}

export function QuoteActions({ quoteId, status, totalLabel }: { quoteId: string; status: string; totalLabel: string }) {
  const [msg, setMsg] = useState<ServiceActionState>();
  const [pending, start] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [state, onSubmit, declPending] = useFormAction(declineQuote.bind(null, quoteId));
  if (status === "accepted") {
    return <PayButton label={`Pay ${totalLabel}`} start={() => payServiceQuote(quoteId)} confirm={confirmServicePayment} />;
  }
  if (status !== "issued") return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={pending} onClick={() => start(async () => setMsg(await acceptQuote(quoteId)))}>
          {pending ? "Accepting…" : "Accept quote"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setDeclining((d) => !d)}>
          Ask for changes
        </button>
      </div>
      <FormMessage state={msg} />
      {declining && (
        <form onSubmit={onSubmit} className="space-y-2">
          <label htmlFor="decline-reason" className="label">
            What would you like changed?
          </label>
          <textarea id="decline-reason" name="reason" rows={3} className="field py-2.5" />
          <FormMessage state={state} />
          <button type="submit" className="btn-ghost" disabled={declPending}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}

export function ReviewActions({ orderId, revisionsLeft }: { orderId: string; revisionsLeft: number }) {
  const [msg, setMsg] = useState<ServiceActionState>();
  const [pending, start] = useTransition();
  const [revState, onRevision, revPending] = useFormAction(requestRevision.bind(null, orderId));
  const [extraState, onExtra, extraPending] = useFormAction(requestExtraWork.bind(null, orderId));
  return (
    <div className="space-y-5">
      <div>
        <button type="button" className="btn-accent" disabled={pending} onClick={() => start(async () => setMsg(await approveDelivery(orderId)))}>
          {pending ? "Approving…" : "Approve files"}
        </button>
        <FormMessage state={msg} />
      </div>
      {revisionsLeft > 0 ? (
        <form onSubmit={onRevision} className="space-y-2">
          <label htmlFor="rev-note" className="label">
            Request a revision ({revisionsLeft} included revision{revisionsLeft === 1 ? "" : "s"} left)
          </label>
          <textarea id="rev-note" name="note" rows={3} className="field py-2.5" placeholder="List every change in one go." />
          <FormMessage state={revState} />
          <button type="submit" className="btn-ghost" disabled={revPending}>
            Request revision
          </button>
        </form>
      ) : (
        <form onSubmit={onExtra} className="space-y-2">
          <label htmlFor="extra-note" className="label">
            Included revisions used. Need more changes? Ask for a quote.
          </label>
          <textarea id="extra-note" name="note" rows={3} className="field py-2.5" />
          <FormMessage state={extraState} />
          <button type="submit" className="btn-ghost" disabled={extraPending}>
            Ask for a quote
          </button>
        </form>
      )}
    </div>
  );
}

export function CancelService({ orderId, paid }: { orderId: string; paid: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<ServiceActionState>();
  const [pending, start] = useTransition();
  if (msg?.ok) return <FormMessage state={msg} />;
  return confirming ? (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-line p-3">
      <p className="text-sm">{paid ? "Cancel and get a full refund? Work hasn't started yet." : "Cancel this request? Nothing has been charged."}</p>
      <div className="flex gap-2">
        <button type="button" className="btn bg-danger text-white" disabled={pending} onClick={() => start(async () => setMsg(await cancelMyService(orderId)))}>
          Yes, cancel
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
          Keep
        </button>
      </div>
      <FormMessage state={msg} />
    </div>
  ) : (
    <button type="button" className="text-sm text-danger underline" onClick={() => setConfirming(true)}>
      Cancel request
    </button>
  );
}

/** Replaces this request (and the book's other cover/formatting/launch kit requests) with one bundle request. */
export function UpgradeToBundle({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await requestBundleUpgrade(orderId);
            setError(res?.error ?? null);
          })
        }
      >
        {pending ? "Requesting…" : "Request bundle upgrade"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </>
  );
}
