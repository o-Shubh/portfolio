/** The one place marigold appears in the workspace: marks Author Pro. */
export function ProBadge({ className = "" }: { className?: string }) {
  return <span className={`badge bg-marigold text-navy ${className}`}>Pro</span>;
}
