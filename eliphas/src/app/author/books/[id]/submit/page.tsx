import { CheckCircle2, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { getOwnBookOr404 } from "@/lib/author-books";
import { coverUrl } from "@/lib/books";
import { estimateCopy, ruleFromPlanVersion } from "@/lib/commission";
import { getCurrentProfile } from "@/lib/auth";
import { authorRule, getCommissionTerms, getCurrentPlans, termsRequirement } from "@/lib/plans";
import { gatewayPercent, printCost } from "@/lib/pricing";
import { submitChecklist } from "@/lib/publishing";
import { getPricingSettings } from "@/lib/settings";
import { AcceptTerms } from "@/components/AcceptTerms";
import { BookServicesCard } from "@/components/BookServicesCard";
import { EditionIdentity } from "@/components/editions/EditionIdentity";
import { ContentCheckReport } from "@/components/ContentCheckReport";
import { submitBlockers } from "@/lib/content-check";
import { checkResults, latestCheck } from "@/lib/manuscript-check";
import { RunContentCheck } from "@/components/RunContentCheck";
import { ContentSettingsForm } from "./ContentCheck";
import { SubmitActions } from "./SubmitActions";

export const metadata: Metadata = { title: "Submit for review" };

export default async function SubmitPage({ params }: PageProps<"/author/books/[id]/submit">) {
  const { id } = await params;
  const { book } = await getOwnBookOr404(id);
  const settings = await getPricingSettings();
  const [profile, current, terms, plans] = await Promise.all([getCurrentProfile(), authorRule(book.author_id), getCommissionTerms(), getCurrentPlans()]);
  const termsReq = termsRequirement(book, profile!);
  // A new book can only go on sale under the current terms, so preview it on Free rather than original terms.
  const version = termsReq.required ? plans.free : current.version;
  const rule = termsReq.required ? ruleFromPlanVersion(plans.free) : current.rule;
  const checklist = submitChecklist(book, settings, rule, termsReq);
  const check = await latestCheck(book);
  const results = checkResults(check);
  const blockers = submitBlockers(results, { ageRating: book.age_rating, contentNote: book.content_note });
  const ready = checklist.every((c) => c.ok) && blockers.length === 0;
  const editable = ["draft", "changes_requested", "unpublished"].includes(book.status);

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
  const e = cost !== null && book.mrp !== null ? estimateCopy(Number(book.mrp) * 100, cost * 100, rule, gatewayPercent(settings.fees)) : null;

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-[1fr_minmax(0,320px)]">
      <div className="space-y-6">
        <EditionIdentity book={book} viewer="author" />
        <section className="card">
          <h2 className="text-xl">Checklist</h2>
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
                  <Link href={`/author/books/${book.id}/${c.step}`} className="ml-auto inline-flex min-h-11 items-center px-1 text-sm font-semibold underline">
                    Fix
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3" aria-labelledby="content-check-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="content-check-h" className="text-xl">
              Content check
            </h2>
            {check && <span className="text-xs text-muted">Checked {new Date(check.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</span>}
          </div>
          <p className="text-sm text-muted">
            Seven automatic checks on your manuscript, title and description. They help you fix problems before review; our team makes the final decision.
          </p>
          {!book.manuscript_path ? (
            <p className="text-sm">Upload your manuscript first.</p>
          ) : (
            <>
              {results && <ContentCheckReport results={results} />}
              {blockers.length > 0 && results && (
                <div role="note" className="notice-danger">
                  <div>
                    <p className="font-semibold">Before you can send it for review</p>
                    <ul className="mt-1 list-disc pl-5">
                      {blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {editable && <RunContentCheck bookId={book.id} auto={!check} label={check ? "Check again" : "Run the check"} />}
            </>
          )}
          <ContentSettingsForm bookId={book.id} ageRating={book.age_rating} note={book.content_note ?? ""} editable={editable} />
        </section>

        {termsReq.required && !termsReq.accepted && (
          <section className="card">
            <AcceptTerms summary={terms.summary} version={terms.version} />
          </section>
        )}

        <section className="card">
          <SubmitActions bookId={book.id} status={book.status} ready={ready} slug={book.slug} />
        </section>

        <BookServicesCard bookId={book.id} authorId={book.author_id} />
      </div>

      <aside className="space-y-6">
        <div className="mx-auto w-40">
          <BookCover
            title={book.title}
            author={book.author_name}
            slug={book.slug}
            src={book.cover_path ? `${coverUrl(book.cover_path)}?v=${new Date(book.updated_at).getTime()}` : null}
          />
        </div>
        {e && (
          <div className="card">
            <h2 className="text-lg">Per copy</h2>
            <p className="mb-3 text-xs text-muted">Your plan: {version.plan === "legacy" ? "original terms" : version.plan === "pro" ? "Pro" : "Free"}</p>
            <EarningsBreakdown e={e} />
          </div>
        )}
      </aside>
    </div>
  );
}
