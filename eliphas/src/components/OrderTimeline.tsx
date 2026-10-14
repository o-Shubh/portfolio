import { Check } from "lucide-react";
import { TRACKING_STEPS } from "@/lib/order-status";

type Times = Partial<Record<"paid_at" | "accepted_at" | "printed_at" | "shipped_at" | "delivered_at", string | null>>;

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;

/** Vertical tracking timeline: done steps filled, the rest waiting. */
export function OrderTimeline({ order }: { order: Times }) {
  return (
    <ol className="space-y-0">
      {TRACKING_STEPS.map((step, i) => {
        const at = order[step.at];
        const done = Boolean(at);
        const last = i === TRACKING_STEPS.length - 1;
        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span aria-hidden className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 ${done ? "bg-success" : "bg-line"}`} />}
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? "bg-success text-white dark:text-ink" : "bg-surface-2 text-muted ring-1 ring-line"}`}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : <span className="text-xs font-semibold">{i + 1}</span>}
            </span>
            <div className="pt-1">
              <p className={`font-semibold ${done ? "" : "text-muted"}`}>{step.label}</p>
              {done && <p className="text-sm text-muted">{when(at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
