import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";
import { listOwnBooks } from "@/lib/author-books";
import { STATUS, type BookStatus } from "@/lib/publishing";

export const metadata: Metadata = { title: "Author dashboard" };

export default async function AuthorHome() {
  const profile = await requireRole(["author", "admin"]);
  const books = await listOwnBooks();
  const count = (s: BookStatus) => books.filter((b) => b.status === s).length;
  const needsAction = books.filter((b) => b.status === "changes_requested");

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name?.split(" ")[0]}`}
        intro="Your author workspace."
        action={
          <Link href="/author/books/new" className="btn-accent">
            <Plus className="h-5 w-5" aria-hidden /> New book
          </Link>
        }
      />

      {needsAction.length > 0 && (
        <div className="card mb-6 ring-2 ring-danger/40">
          <h2 className="text-lg font-semibold">Needs your attention</h2>
          <ul className="mt-2 space-y-1">
            {needsAction.map((b) => (
              <li key={b.id}>
                <Link href={`/author/books/${b.id}`} className="font-medium underline">
                  {b.title}
                </Link>{" "}
                — our team asked for changes.
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["published", "in_review", "changes_requested", "draft"] as BookStatus[]).map((s) => (
          <Link key={s} href="/author/books" className="card transition hover:-translate-y-0.5 hover:shadow-lift">
            <dt className="text-sm text-muted">{STATUS[s].label}</dt>
            <dd className="mt-1 font-heading text-3xl font-semibold">{count(s)}</dd>
          </Link>
        ))}
      </dl>

      {books.length > 0 && (
        <section className="card mb-6">
          <h2 className="text-lg font-semibold">Recent books</h2>
          <ul className="mt-3 divide-y divide-line">
            {books.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/author/books/${b.id}`} className="truncate font-medium hover:underline">
                  {b.title}
                </Link>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ComingSoon milestone={6} items={["Earnings", "Copies sold by month", "Sales by city", "Order tracking"]} />
    </>
  );
}
