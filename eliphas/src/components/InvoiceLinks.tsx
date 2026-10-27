import { FileText } from "lucide-react";
import Link from "next/link";

export type InvoiceLink = { id: string; number: string; kind: string; title: string };

/** Links to an order's or payment's invoice and any credit notes. */
export function InvoiceLinks({ docs, compact = false }: { docs: InvoiceLink[]; compact?: boolean }) {
  if (!docs.length) return null;
  return (
    <ul className={compact ? "flex flex-wrap gap-x-3 gap-y-1" : "space-y-1"} data-testid="invoice-links">
      {docs.map((d) => (
        <li key={d.id}>
          <Link href={`/invoices/${d.id}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-fg hover:underline md:min-h-0">
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            {d.kind === "credit_note" ? "Credit note" : d.title}
            <span className="id-mono font-normal text-muted">{d.number}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
