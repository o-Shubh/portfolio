import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { CHECKS } from "@/lib/content-check";
import { BUILT_IN_TERMS } from "@/lib/content-terms";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddTermForm, RemoveTerm } from "./TermForms";

export const metadata: Metadata = { title: "Content checks" };

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const LISTS = [
  { key: "language", label: "Abusive language" },
  { key: "hate", label: "Hate speech" },
  { key: "adult", label: "Sexual content" },
  { key: "violence", label: "Violence and self-harm" },
  { key: "allow", label: "Allowed (never flagged)" },
] as const;

export default async function ContentChecksPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const [{ data: terms }, { data: recent }] = await Promise.all([
    admin.from("content_terms").select("term, category, created_at").order("created_at", { ascending: false }),
    admin.from("manuscript_checks").select("overall").gte("created_at", daysAgo(30)),
  ]);
  const count = (o: string) => (recent ?? []).filter((r) => r.overall === o).length;

  return (
    <>
      <PageHeader
        title="Content checks"
        intro="Every manuscript goes through seven automatic checks before it can be sent for review. They flag; you decide."
      />
      <dl className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Clear (30 days)", count("pass")],
          ["To look at", count("review")],
          ["Needed author action", count("blocked")],
        ].map(([label, n]) => (
          <div key={label} className="card">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="display mt-1 text-2xl">{n}</dd>
          </div>
        ))}
      </dl>

      <section className="card mb-8">
        <h2 className="text-lg">The seven checks</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          {CHECKS.map((c) => (
            <li key={c.key}>
              <span className="font-semibold">{c.title}:</span> <span className="text-muted">{c.what}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          Words are matched as whole words or phrases, so &ldquo;class&rdquo; never matches &ldquo;ass&rdquo;. A word ending in * matches any word starting with
          it. Authors see where each match is (with the word masked) and can fix it, add the 18+ label, or explain it in a note to you.
        </p>
      </section>

      <AddTermForm />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {LISTS.map((l) => {
          const mine = (terms ?? []).filter((t) => t.category === l.key);
          const builtIn = l.key === "allow" ? 0 : BUILT_IN_TERMS[l.key].length;
          return (
            <section key={l.key} className="card" data-testid={`terms-${l.key}`}>
              <h2 className="text-lg">{l.label}</h2>
              <p className="text-sm text-muted">
                {l.key === "allow"
                  ? "Words you've allowed, to stop false alarms (for example a caste name used respectfully)."
                  : `${builtIn} built-in words and phrases, plus yours:`}
              </p>
              {mine.length === 0 ? (
                <p className="mt-2 text-sm text-muted">None added.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {mine.map((t) => (
                    <li key={t.term} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-sm">
                      {t.term}
                      <RemoveTerm term={t.term} category={t.category} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
