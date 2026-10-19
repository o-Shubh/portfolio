"use client";

import { useId, useState } from "react";
import { requestDistribution, reviewDistribution } from "@/app/actions/distribution";
import { FormMessage } from "@/components/FormMessage";
import { formatPaise } from "@/lib/commission";
import { CHANNELS, DISTRIBUTION_STATUS, REVIEW_STATUSES, distributionEstimate, type Channel } from "@/lib/distribution";
import { useFormAction } from "@/lib/use-form-action";

const CHANNEL_HINTS: Record<Channel, string> = {
  amazon_india: "Listing on Amazon.in",
  flipkart: "Listing on Flipkart",
  international: "Retailers outside India",
};

/** Author: ask for one book and one channel. `taken` lists "bookId:channel" pairs already requested. */
export function DistributionRequestForm({ books, taken }: { books: { id: string; title: string }[]; taken: string[] }) {
  const [state, submit, pending] = useFormAction(requestDistribution);
  const [book, setBook] = useState(books.length === 1 ? books[0].id : "");
  const [channel, setChannel] = useState<Channel | "">("");
  const isTaken = (c: Channel) => Boolean(book) && taken.includes(`${book}:${c}`);
  const allTaken = Boolean(book) && (Object.keys(CHANNELS) as Channel[]).every(isTaken);

  return (
    <form onSubmit={submit} className="card space-y-5" aria-labelledby="request-heading">
      <div>
        <h2 id="request-heading" className="text-xl">
          Request a review
        </h2>
        <p className="mt-1 text-sm text-muted">Choose a book and a channel. We check eligibility first; nothing is listed or charged automatically.</p>
      </div>

      <div>
        <label htmlFor="dist-book" className="label">
          Published book
        </label>
        <select
          id="dist-book"
          name="book_id"
          required
          className="field"
          value={book}
          onChange={(e) => {
            setBook(e.target.value);
            setChannel("");
          }}
        >
          {books.length !== 1 && <option value="">Choose a book</option>}
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">Channel</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(CHANNELS) as Channel[]).map((c) => {
            const done = isTaken(c);
            return (
              <label
                key={c}
                className={`flex min-h-16 cursor-pointer flex-col justify-center rounded-[var(--radius-control)] px-3.5 py-2.5 ring-1 ring-line-strong transition-[background-color,box-shadow] duration-[var(--motion-ui)] ring-inset has-[:checked]:bg-tint-info has-[:checked]:ring-2 has-[:checked]:ring-focus has-[:focus-visible]:shadow-[0_0_0_3px_rgb(74_99_201/0.25)] ${
                  done ? "cursor-not-allowed opacity-55" : "hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  value={c}
                  required
                  disabled={done}
                  checked={channel === c}
                  onChange={() => setChannel(c)}
                  className="sr-only"
                />
                <span className="font-medium">{CHANNELS[c]}</span>
                <span className="text-sm text-muted">{done ? "Already requested" : CHANNEL_HINTS[c]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dist-country" className="label">
            Country of residence
          </label>
          <input
            id="dist-country"
            name="residence_country"
            required
            minLength={2}
            maxLength={80}
            autoComplete="country-name"
            placeholder="India"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="dist-markets" className="label">
            Where you want to sell
          </label>
          <input
            id="dist-markets"
            name="markets"
            required
            minLength={2}
            maxLength={200}
            placeholder="India, United Kingdom"
            aria-describedby="dist-markets-hint"
            className="field"
          />
          <p id="dist-markets-hint" className="hint">
            Countries, separated by commas.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 text-[0.9375rem]">
        <input type="checkbox" name="rights" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" />
        <span>I hold the distribution rights for this edition in these countries.</span>
      </label>

      <p className="notice-info">
        Before any listing we confirm retailer approval, printing coverage, pricing and how payouts would work, and we agree terms with you. An Edition ID is
        not an ISBN.
      </p>

      <FormMessage state={state} />
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending || allTaken}>
        {pending ? "Sending…" : allTaken ? "All channels requested" : "Send request"}
      </button>
    </form>
  );
}

/** Admin: set a status and a note the author sees. `updatedAt` guards against overwriting a newer review. */
export function DistributionReviewForm({ id, updatedAt, status, note }: { id: string; updatedAt: string; status: string; note: string }) {
  const [state, submit, pending] = useFormAction(reviewDistribution);
  const uid = useId();
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-line pt-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="previous" value={updatedAt} />
      <fieldset>
        <legend className="label">Status</legend>
        <div className="segmented flex w-full sm:w-auto">
          {REVIEW_STATUSES.map((s) => (
            <label
              key={s}
              className="segment flex-1 cursor-pointer whitespace-nowrap has-[:checked]:bg-surface has-[:checked]:text-fg has-[:checked]:shadow-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus"
            >
              <input type="radio" name="status" value={s} defaultChecked={(status === "requested" ? "reviewing" : status) === s} className="sr-only" />
              {s === "needs_information" ? "Needs info" : DISTRIBUTION_STATUS[s].label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${uid}-note`} className="label">
          Note to the author
        </label>
        <textarea id={`${uid}-note`} name="review_note" defaultValue={note} minLength={5} maxLength={2000} required rows={3} className="field py-2.5" />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}

const CALC_FIELDS = [
  {
    label: "Retailer payout per copy",
    hint: "After the retailer’s own fees and deductions",
    unit: "₹",
  },
  {
    label: "Remaining costs per copy",
    hint: "Print, shipping, tax and risk, excluding the retailer’s deductions",
    unit: "₹",
  },
  {
    label: "Proposed platform share",
    hint: "Of the surplus after costs",
    unit: "%",
  },
  {
    label: "Platform operating cost per copy",
    hint: "Support, review and handling",
    unit: "₹",
  },
  {
    label: "Minimum contribution per copy",
    hint: "The target the result must reach",
    unit: "₹",
  },
] as const;

/** Admin planning tool. Example numbers only; not commercial pricing and not connected to royalties. */
export function DistributionCalculator() {
  const [values, setValues] = useState<number[]>([250, 120, 20, 10, 15]);
  let result: ReturnType<typeof distributionEstimate> | undefined;
  try {
    const p = (n: number) => Math.round(n * 100);
    result = distributionEstimate(p(values[0]), p(values[1]), values[2], p(values[3]), p(values[4]));
  } catch {
    result = undefined;
  }
  const money = (paise: number) => (paise < 0 ? "−" : "") + formatPaise(Math.abs(paise), true);

  return (
    <section className="card space-y-5" aria-labelledby="calc-heading">
      <div>
        <h2 id="calc-heading" className="text-xl">
          Channel margin calculator
        </h2>
        <p className="mt-1 text-sm text-muted">
          For planning only. The defaults are examples, not approved prices, and nothing here changes royalties or creates a quote. Use one currency and one tax
          basis, and don’t count retailer fees twice.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CALC_FIELDS.map((f, i) => (
          <div key={f.label}>
            <label htmlFor={`calc-${i}`} className="label">
              {f.label}
            </label>
            <div className="relative">
              <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${f.unit === "%" ? "right-3.5" : "left-3.5"}`} aria-hidden>
                {f.unit}
              </span>
              <input
                id={`calc-${i}`}
                className={`field mono ${f.unit === "%" ? "pr-8" : "pl-8"}`}
                type="number"
                inputMode="decimal"
                min="0"
                max={f.unit === "%" ? 100 : 10000000}
                step="0.01"
                aria-describedby={`calc-${i}-hint`}
                value={Number.isNaN(values[i]) ? "" : values[i]}
                onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.valueAsNumber : v)))}
              />
            </div>
            <p id={`calc-${i}-hint`} className="hint">
              {f.hint}
            </p>
          </div>
        ))}
      </div>

      <div aria-live="polite">
        {result ? (
          <div className="space-y-3">
            <dl className="group-list">
              <Row label="Surplus after costs" value={money(result.pool)} />
              <Row label="Author estimate" value={money(result.author)} strong />
              <Row label="Platform share" value={money(result.platform)} />
              <Row label="Contribution after operating cost" value={money(result.contribution)} strong />
            </dl>
            <p className={result.viable ? "notice-success" : "notice-warn"}>
              {result.viable
                ? "Meets the minimum contribution you entered."
                : "Below the minimum contribution. Revise the price or costs before offering terms."}
            </p>
            <p className="text-sm text-muted">Before monthly fixed costs. Returns and exchange rates can change the outcome.</p>
          </div>
        ) : (
          <p role="alert" className="notice-danger">
            Enter amounts of zero or more, and a share between 0 and 100%.
          </p>
        )}
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="group-row justify-between">
      <dt className="text-[0.9375rem] text-muted">{label}</dt>
      <dd className={`mono ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
