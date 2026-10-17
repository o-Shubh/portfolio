import type { LucideIcon } from "lucide-react";

/** Nothing here yet: say so plainly and offer the useful next step. */
export function EmptyState({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-12 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted" aria-hidden />}
      <p className="mt-3 text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-md text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
