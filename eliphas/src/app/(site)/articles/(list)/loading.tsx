export default function Loading() {
  return (
    <div className="container-x py-5 md:py-8" aria-busy="true" aria-label="Loading articles">
      <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-8 w-48 animate-pulse rounded bg-surface-2" />
      <div className="mt-5 h-14 animate-pulse rounded-xl bg-surface-2" />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="h-72 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </ul>
    </div>
  );
}
