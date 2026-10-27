import { BookOpenText, Feather, FileDown, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { BOOK_STATUS, LANGUAGE } from "@/lib/studio/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My books" };

/** Studio dashboard: the author's books in the Studio, and the way to start a new one. */
export default async function StudioDashboard() {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);
  const supabase = await createClient();
  // Row-level security already limits this to the author's own books; the filter keeps admins to theirs too
  const { data: books } = await supabase
    .from("studio_books")
    .select("id, title, genre, language, status, updated_at, studio_chapters(status)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  const newBook = (
    <Link href="/studio/new" className="btn-primary gap-2" data-testid="studio-new-book">
      <Plus className="h-4 w-4" aria-hidden /> Start a new book
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Writing Studio"
        intro="Go from an idea to a finished manuscript with a team of AI assistants. You approve every chapter, and your manuscript stays private to you."
        action={books?.length ? newBook : undefined}
      />

      {!books?.length ? (
        <section className="card overflow-hidden p-0" data-testid="studio-empty">
          <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
            <div>
              <p className="eyebrow">Your first book</p>
              <h2 className="display mt-2 text-2xl md:text-3xl">Every book starts with an idea.</h2>
              <p className="mt-3 max-w-md text-muted">
                Tell us your idea, who it&apos;s for, and share a few pages of your own writing so the assistants learn your voice. You stay the author
                at every step.
              </p>
              <div className="mt-6">{newBook}</div>
            </div>
            <ol className="space-y-4">
              {[
                { icon: BookOpenText, title: "Plan", text: "An architect proposes your book's big idea and a chapter outline. Edit it until it's yours, then lock it." },
                { icon: Feather, title: "Write", text: "For each chapter: research, a first draft in your voice, notes from three reviewers, and your edits. You approve it." },
                { icon: FileDown, title: "Finish", text: "A full-book review, then export to Word, PDF and EPUB, with an honest note on how AI helped." },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-[var(--radius-card)] bg-surface-2 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-accent-fg ring-1 ring-line">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {i + 1}. {s.title}
                    </span>
                    <span className="block text-sm text-muted">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="studio-books">
          {books.map((b) => {
            const done = b.studio_chapters.filter((c) => c.status === "approved" || c.status === "locked").length;
            const total = b.studio_chapters.length;
            return (
              <li key={b.id}>
                <Link href={`/studio/${b.id}`} className="card block h-full transition-shadow hover:shadow-lift">
                  <p className="text-xs font-semibold tracking-wider text-muted uppercase">{BOOK_STATUS[b.status]}</p>
                  <h2 className="mt-1 text-lg leading-snug font-semibold" lang={b.language}>
                    {b.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{[b.genre, LANGUAGE[b.language]].filter(Boolean).join(" · ")}</p>
                  {total > 0 && (
                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        {done} of {total} {total === 1 ? "chapter" : "chapters"} approved
                      </p>
                    </div>
                  )}
                  <p className="mt-4 text-xs text-muted">Updated {new Date(b.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
