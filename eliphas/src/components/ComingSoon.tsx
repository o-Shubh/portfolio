/** Placeholder card listing what a later milestone will add to this screen. */
export function ComingSoon({ milestone, items }: { milestone: number; items: string[] }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">Coming in milestone {milestone}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
