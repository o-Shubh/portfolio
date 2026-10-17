/** Top of every app screen: where you are (title), what it's for (intro) and the one main action. */
export function PageHeader({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] md:text-[2.125rem]">{title}</h1>
        {intro && <p className="mt-1.5 max-w-2xl text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}
