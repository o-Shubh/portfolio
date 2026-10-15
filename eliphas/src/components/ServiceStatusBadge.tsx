import { SERVICE_STATUS, type ServiceStatus } from "@/lib/services";

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const s = SERVICE_STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${s.tone}`}>{s.label}</span>;
}
