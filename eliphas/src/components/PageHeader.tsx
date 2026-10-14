export function PageHeader({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {intro && <p className="mt-1 text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}
