"use client";

import { useState, useTransition } from "react";
import { adjustCredit, blockReferral, cancelReward, runReferralRewards, saveReferralSettings, type ReferralActionState } from "@/app/actions/referrals";
import { FormMessage } from "@/components/FormMessage";
import type { ReferralSettings } from "@/lib/referral-rules";
import { offlineSafe, useFormAction } from "@/lib/use-form-action";

function Switch({ name, label, hint, on }: { name: string; label: string; hint?: string; on: boolean }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={on} className="mt-0.5 h-5 w-5 accent-fg" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function Num({ name, label, value, unit, hint }: { name: keyof ReferralSettings; label: string; value: number; unit: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={`ref-${name}`} className="label">
        {label} <span className="font-normal text-muted">({unit})</span>
      </label>
      <input id={`ref-${name}`} name={name} type="number" inputMode="numeric" min={0} step={1} defaultValue={value} className="field" required />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function ReferralSettingsForm({ settings: s }: { settings: ReferralSettings }) {
  const [state, onSubmit, pending, { onChange }] = useFormAction(saveReferralSettings, { warnUnsaved: true });
  return (
    <form onSubmit={onSubmit} onChange={onChange} className="space-y-6">
      <section className="card space-y-4">
        <Switch
          name="enabled"
          label="Invite programme is on"
          hint="Master switch. While off, nobody sees invite links, discounts or the Invite friends page, and no rewards are given. Credit already earned can still be used."
          on={s.enabled}
        />
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg">Reader invites a friend</h2>
        <Switch name="reader_enabled" label="On" on={s.reader_enabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Num name="reader_friend_discount" label="Friend's discount on first order" value={s.reader_friend_discount} unit="₹" />
          <Num name="reader_referrer_credit" label="Credit for the reader who invited" value={s.reader_referrer_credit} unit="₹" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg">Author&apos;s link brings a new customer</h2>
        <p className="text-sm text-muted">Authors share their invite link or book links. Their royalty is unchanged; this credit is extra.</p>
        <Switch name="author_enabled" label="On" on={s.author_enabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Num name="author_buyer_discount" label="New customer's discount on first order" value={s.author_buyer_discount} unit="₹" />
          <Num name="author_credit" label="Credit for the author" value={s.author_credit} unit="₹" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg">Invited person publishes their first book</h2>
        <Switch name="author_author_enabled" label="On" on={s.author_author_enabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Num name="author_author_credit" label="Credit for each of the two" value={s.author_author_credit} unit="₹" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg">Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Num name="min_order" label="Minimum first order (books, before shipping)" value={s.min_order} unit="₹" hint="0 = any order" />
          <Num name="monthly_cap" label="Most credit one person can earn a month" value={s.monthly_cap} unit="₹" hint="0 = no limit" />
          <Num name="credit_expiry_days" label="Credit expires after" value={s.credit_expiry_days} unit="days" />
          <Num
            name="reward_wait_days"
            label="Wait after delivery before rewarding"
            value={s.reward_wait_days}
            unit="days"
            hint="Matches the 7-day problem window on the Refunds page"
          />
          <Num name="max_credit_percent" label="Credit can pay up to" value={s.max_credit_percent} unit="% of the books" />
        </div>
        <p className="text-sm text-muted">
          Discounts and credit come out of the platform&apos;s share; authors always earn on the full price. A discount bigger than your commission on an order
          means that order costs you money.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save programme settings"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ProcessRewardsButton() {
  const [state, setState] = useState<ReferralActionState>();
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-ghost min-h-11 px-4 text-sm"
        disabled={pending}
        onClick={() => start(async () => setState((await offlineSafe(runReferralRewards())) as ReferralActionState))}
      >
        {pending ? "Checking…" : "Give due rewards now"}
      </button>
      <FormMessage state={state} />
    </span>
  );
}

/** A small "reason" form behind a summary, for blocking an invite or cancelling a reward. */
export function ReasonForm({ kind, id }: { kind: "block" | "cancel"; id: string }) {
  const action = kind === "block" ? blockReferral.bind(null, id) : cancelReward.bind(null, id);
  const [state, onSubmit, pending] = useFormAction(action);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold underline underline-offset-2">{kind === "block" ? "Block invite" : "Cancel reward"}</summary>
      <form onSubmit={onSubmit} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`reason-${kind}-${id}`} className="label">
            Reason
          </label>
          <input
            id={`reason-${kind}-${id}`}
            name="reason"
            maxLength={300}
            className="field"
            placeholder={kind === "block" ? "e.g. Same person, second account" : "e.g. Order returned"}
          />
        </div>
        <button type="submit" className="btn-ghost min-h-11 px-3" disabled={pending}>
          {pending ? "Saving…" : kind === "block" ? "Block" : "Cancel reward"}
        </button>
        <div className="w-full">
          <FormMessage state={state} />
        </div>
      </form>
    </details>
  );
}

export function AdjustCreditForm() {
  const [state, onSubmit, pending] = useFormAction(adjustCredit);
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="text-lg">Adjust someone&apos;s credit</h2>
      <p className="text-sm text-muted">For support cases. Use a minus amount to remove credit. Added credit expires like any other.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="adj-phone" className="label">
            Mobile number
          </label>
          <input id="adj-phone" name="phone" type="tel" inputMode="numeric" className="field" required />
        </div>
        <div>
          <label htmlFor="adj-amount" className="label">
            Amount (₹)
          </label>
          <input id="adj-amount" name="amount" type="number" step={1} className="field" required />
        </div>
        <div>
          <label htmlFor="adj-note" className="label">
            Note
          </label>
          <input id="adj-note" name="note" maxLength={300} className="field" required placeholder="Why" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Adjust credit"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
