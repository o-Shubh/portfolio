import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Start a new book" };

/** Placeholder until the setup wizard arrives in Phase 2 (the Studio is admin-only until then). */
export default function NewStudioBook() {
  return (
    <>
      <PageHeader title="Start a new book" />
      <div className="card max-w-xl" data-testid="studio-wizard-soon">
        <p className="font-medium">The setup wizard arrives in the next phase.</p>
        <p className="mt-1 text-sm text-muted">You&apos;ll enter your idea, genre, language, target reader, length and two or three samples of your own writing.</p>
        <Link href="/studio" className="btn-ghost mt-4">
          Back to my books
        </Link>
      </div>
    </>
  );
}
