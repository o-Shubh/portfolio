import { STATUS, type BookStatus } from "@/lib/publishing";

export function StatusBadge({ status }: { status: BookStatus }) {
  const s = STATUS[status];
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}
