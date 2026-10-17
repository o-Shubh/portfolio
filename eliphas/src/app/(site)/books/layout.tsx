/** Bookstore and reading areas sit on warm ivory paper; dashboards and checkout stay neutral. */
export default function EditorialLayout({ children }: { children: React.ReactNode }) {
  return <div className="editorial min-h-full pb-6">{children}</div>;
}
