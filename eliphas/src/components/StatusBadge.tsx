import { STATUS, type BookStatus } from "@/lib/publishing";

export function StatusBadge({ status }: { status: BookStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>;
}
