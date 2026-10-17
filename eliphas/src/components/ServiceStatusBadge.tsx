import { SERVICE_STATUS, type ServiceStatus } from "@/lib/services";

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const s = SERVICE_STATUS[status];
  return <span className={`badge whitespace-nowrap ${s.tone}`}>{s.label}</span>;
}
