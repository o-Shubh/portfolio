import { formatPaise, type CopyEstimate } from "@/lib/commission";

/** How one copy's selling price is split: printing, commission, GST on commission, payment charges, author. */
export function EarningsBreakdown({ e, commissionLabel = "Platform commission" }: { e: CopyEstimate; commissionLabel?: string }) {
  const parts = [
    { label: "Printing", value: e.printCostPaise, className: "bg-fg/80" },
    { label: commissionLabel, value: e.commissionPaise + e.commissionGstPaise, className: "bg-muted" },
    { label: "Payment charges", value: e.gatewayPaise, className: "bg-line-strong" },
    { label: "You earn", value: Math.max(0, e.authorEarningPaise), className: "bg-gold" },
  ];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        {parts.map((p) => (
          <div key={p.label} className={p.className} style={{ width: `${Math.max(0, (p.value / e.pricePaise) * 100)}%` }} />
        ))}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Book price (reader pays)" value={formatPaise(e.pricePaise)} strong />
        <Row label="− Printing" value={formatPaise(e.printCostPaise)} />
        <Row label={`− ${commissionLabel}`} value={formatPaise(e.commissionPaise)} />
        <Row label="− GST on commission" value={formatPaise(e.commissionGstPaise)} />
        <Row label="− Payment charges (estimate)" value={formatPaise(e.gatewayPaise)} />
        <div className="border-t border-line pt-2">
          <Row
            label="You earn per copy"
            value={formatPaise(e.authorEarningPaise)}
            strong
            valueClass={e.authorEarningPaise < 0 ? "text-danger" : "text-success"}
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
