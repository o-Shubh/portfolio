import type { Earnings } from "@/lib/pricing";
import { rupees } from "@/lib/pricing";

/** Shows how one copy's MRP is split: print, fee, payment charges, author. */
export function EarningsBreakdown({ e }: { e: Earnings }) {
  const parts = [
    { label: "Printing", value: e.printCost, className: "bg-fg/80" },
    { label: "Platform fee", value: e.platformFee, className: "bg-muted" },
    { label: "Payment charges", value: e.paymentFee, className: "bg-line" },
    { label: "You earn", value: Math.max(0, e.authorEarning), className: "bg-marigold" },
  ];
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full" aria-hidden>
        {parts.map((p) => (
          <div key={p.label} className={p.className} style={{ width: `${(p.value / e.mrp) * 100}%` }} />
        ))}
      </div>
      <dl className="mt-4 space-y-2">
        <Row label="MRP (reader pays)" value={rupees(e.mrp)} strong />
        <Row label="− Printing" value={rupees(e.printCost)} />
        <Row label="− Platform fee" value={rupees(e.platformFee)} />
        <Row label="− Payment charges" value={rupees(e.paymentFee)} />
        <div className="border-t border-line pt-2">
          <Row
            label="You earn per copy"
            value={rupees(e.authorEarning)}
            strong
            valueClass={e.authorEarning < 0 ? "text-danger" : "text-success"}
          />
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value, strong, valueClass = "" }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : "text-muted"}`}>
      <dt>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-fg" : ""} ${valueClass}`}>{value}</dd>
    </div>
  );
}
