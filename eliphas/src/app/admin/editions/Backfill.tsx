"use client";

import { backfillEditionIds } from "@/app/actions/editions";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

/** Dry run first (count only), then an explicit, confirmed run. Safe to repeat. */
export function Backfill() {
  const [dry, onDry, checking] = useFormAction(backfillEditionIds);
  const [res, onRun, running] = useFormAction(backfillEditionIds);
  const count = dry?.count ?? null;
  return (
    <div className="space-y-4">
      <form onSubmit={onDry}>
        <input type="hidden" name="mode" value="dry" />
        <button type="submit" className="btn-ghost" disabled={checking} data-testid="backfill-dry">
          {checking ? "Counting…" : "Dry run: count editions without an ID"}
        </button>
      </form>
      {dry?.ok && (
        <div role="status" className="rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm" data-testid="backfill-count">
          <p className="font-semibold">{dry.ok}</p>
          {dry.titles && dry.titles.length > 0 && <p className="mt-1 text-muted">{dry.titles.join(" · ")}{(count ?? 0) > dry.titles.length ? " …" : ""}</p>}
        </div>
      )}
      {count !== null && count > 0 && !res?.ok && (
        <form onSubmit={onRun} className="space-y-3">
          <input type="hidden" name="mode" value="run" />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="confirm" className="mt-0.5 h-5 w-5 shrink-0 accent-fg" required />
            <span>
              Assign Edition IDs to these {count} published edition{count === 1 ? "" : "s"}. IDs use this year ({new Date().getFullYear()}), because that&apos;s when
              they&apos;re assigned. They can&apos;t be undone or reused.
            </span>
          </label>
          <button type="submit" className="btn-primary" disabled={running} data-testid="backfill-run">
            {running ? "Assigning…" : `Assign ${count} Edition ID${count === 1 ? "" : "s"}`}
          </button>
        </form>
      )}
      <FormMessage state={res ?? (dry?.error ? dry : undefined)} />
    </div>
  );
}
