"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestBookServices, requestBundleUpgrade } from "@/app/actions/services";
import type { AddOnOption, BookServiceRequest } from "@/lib/book-services";
import { SERVICE_PORTFOLIO } from "@/lib/service-portfolio";
import { addOnBlocked, BUNDLE_CODE, BUNDLE_OVERLAP, BUNDLE_PARTS } from "@/lib/services";
import { SampleGallery } from "./SampleGallery";
import { useFormAction } from "@/lib/use-form-action";
import { FormMessage } from "./FormMessage";
import { ServiceStatusBadge } from "./ServiceStatusBadge";

/**
 * "Need help with this book?" Tick a cover, formatting, launch kit or the bundle and request them in one go.
 * Nothing is charged here: each request gets a fixed quote first.
 */
export function BookAddOns({ bookId, options, requests }: { bookId: string; options: AddOnOption[]; requests: BookServiceRequest[] }) {
  const [state, onSubmit, pending] = useFormAction(requestBookServices.bind(null, bookId));
  const [ticked, setSelected] = useState<Set<string>>(new Set());
  const open = new Set(requests.filter((r) => r.open).map((r) => r.code));
  const done = new Set(requests.filter((r) => r.status === "completed").map((r) => r.code));
  // An active cover, formatting or launch kit request for this book can be upgraded to the bundle
  const upgradable = requests.find((r) => BUNDLE_PARTS.includes(r.code) && (r.open || r.status === "completed"));
  const [upgrading, startUpgrade] = useTransition();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  // Once a request goes through, its tick no longer counts (it's listed above instead)
  const selected = new Set([...ticked].filter((c) => !open.has(c)));

  const toggle = (code: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set([...prev].filter((c) => !open.has(c)));
      if (on) next.add(code);
      else next.delete(code);
      // Ticking the bundle replaces the separate services it includes
      if (code === BUNDLE_CODE && on) for (const c of [...next]) if (addOnBlocked(c, open, next, done)) next.delete(c);
      return next;
    });

  return (
    <section className="card" aria-labelledby="addons-heading">
      <h2 id="addons-heading" className="text-xl">
        Need help with this book?
      </h2>
      <p className="mt-1 text-sm text-muted">
        Add our services for this book. We use the details and files you&apos;ve already added, check them, and send a fixed quote. You pay only after you accept
        it.
      </p>

      {requests.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] bg-surface-2 px-4 text-sm">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <Link href={`/author/services/${r.id}`} className="min-w-0 flex-1 font-medium underline-offset-2 hover:underline">
                {r.name}
              </Link>
              <ServiceStatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <fieldset className="space-y-2">
          <legend className="sr-only">Services to add</legend>
          {options.map((o) => {
            const blocked = addOnBlocked(o.code, open, selected, done);
            const checked = selected.has(o.code);
            const existing = requests.find((r) => r.code === o.code && r.open);
            const samples = SERVICE_PORTFOLIO[o.code]?.samples ?? [];
            const offerUpgrade = o.code === BUNDLE_CODE && blocked === BUNDLE_OVERLAP && upgradable;
            return (
              <div key={o.code} className={`rounded-[var(--radius-card)] border p-3 ${checked ? "border-accent bg-accent/10" : "border-line"}`}>
                <label className={`flex gap-3 ${blocked ? "" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    name="service"
                    value={o.code}
                    checked={checked}
                    disabled={Boolean(blocked) && !checked}
                    onChange={(e) => toggle(o.code, e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-fg"
                  />
                  <span className={`min-w-0 ${blocked ? "opacity-70" : ""}`}>
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">{o.name}</span>
                      <span className="text-sm mono text-muted">{o.price}</span>
                    </span>
                    {blocked ? (
                      <span className="mt-0.5 block text-xs font-medium">{blocked}</span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-muted">{o.deliverables.join(" · ")}</span>
                    )}
                  </span>
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 pl-8">
                  {samples.length > 0 && <SampleGallery title={o.name} samples={samples} compact />}
                  {existing && (
                    <Link href={`/author/services/${existing.id}`} className="inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-2">
                      View existing request
                    </Link>
                  )}
                  {offerUpgrade && (
                    <button
                      type="button"
                      className="btn-ghost min-h-10 px-3 text-sm"
                      disabled={upgrading}
                      onClick={() =>
                        startUpgrade(async () => {
                          const res = await requestBundleUpgrade(upgradable.id);
                          setUpgradeError(res?.error ?? null);
                        })
                      }
                    >
                      {upgrading ? "Requesting…" : "Request bundle upgrade"}
                    </button>
                  )}
                </div>
                {offerUpgrade && (
                  <p className="mt-1 pl-8 text-xs text-muted">
                    We review what you&apos;ve already paid for and what&apos;s done, then send an itemised quote for the difference. Nothing is charged twice.
                  </p>
                )}
                {offerUpgrade && upgradeError && (
                  <p role="alert" className="mt-1 pl-8 text-sm font-medium text-danger">
                    {upgradeError}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>

        {selected.size > 0 && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="rights" className="mt-0.5 h-5 w-5 shrink-0 accent-fg" />
            <span>I confirm I have the rights to this book&apos;s text and to any images or material I provide.</span>
          </label>
        )}
        <FormMessage state={state} />
        <button type="submit" className="btn-primary" disabled={pending || selected.size === 0}>
          {pending ? "Requesting…" : selected.size > 1 ? `Request ${selected.size} services` : "Request service"}
        </button>
        <p className="text-xs text-muted">No payment now. Prices exclude 18% GST. Pro creative credits are separate and aren&apos;t used.</p>
      </form>
    </section>
  );
}
