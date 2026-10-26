import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { CHECKS, type CheckResult } from "@/lib/content-check";

const ICON = {
  pass: <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Passed" />,
  warn: <AlertTriangle className="h-5 w-5 shrink-0 text-gold" aria-label="Look at this" />,
  fail: <XCircle className="h-5 w-5 shrink-0 text-danger" aria-label="Needs action" />,
};

/** The seven content check results, with examples (page and masked text) for anything found. */
export function ContentCheckReport({ results }: { results: CheckResult[] }) {
  return (
    <ul className="divide-y divide-line" data-testid="content-report">
      {CHECKS.map((c) => {
        const r = results.find((x) => x.key === c.key);
        if (!r) return null;
        return (
          <li key={c.key} className="flex gap-3 py-3" data-check={c.key} data-status={r.status}>
            <span className="mt-0.5">{ICON[r.status]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.title}</p>
              <p className="text-sm text-muted">{r.detail}</p>
              {r.examples.length > 0 && (
                <details className="mt-1.5 text-sm">
                  <summary className="cursor-pointer font-medium underline underline-offset-2">
                    Where ({r.examples.length === 5 ? "first 5" : r.examples.length})
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {r.examples.map((e, i) => (
                      <li key={i} className="rounded-[var(--radius-control)] bg-surface-2 px-3 py-2">
                        <span className="text-xs font-semibold text-muted">{e.page === 0 ? "Book details" : `Page ${e.page}`}</span>
                        <span className="block break-words">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
