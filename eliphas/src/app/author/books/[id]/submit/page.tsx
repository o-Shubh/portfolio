import { CheckCircle2, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { getOwnBookOr404 } from "@/lib/author-books";
import { coverUrl } from "@/lib/books";
import { earnings, printCost } from "@/lib/pricing";
import { submitChecklist } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { SubmitActions } from "./SubmitActions";

export const metadata: Metadata = { title: "Submit for review" };

export default async function SubmitPage({ params }: PageProps<"/author/books/[id]/submit">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  const settings = await getPricingSettings();
  const checklist = submitChecklist(book, settings);
  const ready = checklist.every((c) => c.ok);

  const cost =
    book.page_count && book.mrp !== null
      ? printCost(
          {
            page_count: book.page_count,
            trim_size: book.trim_size,
            binding: book.binding,
            interior: book.interior,
            paper: book.paper,
            cover_finish: book.cover_finish,
          },
          settings.rates,
        )
      : null;
  const e = cost !== null && book.mrp !== null ? earnings(Number(book.mrp), cost, settings.fees) : null;
  const isCover = book.cover_path && !book.cover_path.endsWith(".pdf");

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-[1fr_minmax(0,320px)]">
      <div className="space-y-6">
        <section className="card">
          <h2 className="text-xl font-semibold">Checklist</h2>
          <ul className="mt-3 space-y-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-3">
                {c.ok ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Done" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted" aria-label="Not done" />
                )}
                <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                {!c.ok && (
                  <Link href={`/author/books/${book.id}/${c.step}`} className="ml-auto text-sm font-semibold underline">
                    Fix
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <SubmitActions bookId={book.id} status={book.status} ready={ready} slug={book.slug} />
        </section>
      </div>

      <aside className="space-y-6">
        <div className="mx-auto w-40">
          <BookCover
            title={book.title}
            author={book.author_name}
            slug={book.slug}
            src={isCover ? `${coverUrl(book.cover_path)}?v=${new Date(book.updated_at).getTime()}` : null}
          />
        </div>
        {e && (
          <div className="card">
            <h2 className="mb-3 text-lg font-semibold">Per copy</h2>
            <EarningsBreakdown e={e} />
          </div>
        )}
      </aside>
    </div>
  );
}
