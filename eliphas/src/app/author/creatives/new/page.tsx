import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { proStatus } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreativeForm } from "./CreativeForm";

export const metadata: Metadata = { title: "Request a creative" };

export default async function NewCreativePage() {
  const profile = await requireRole(["author", "admin"]);
  const [status, { data: books }] = await Promise.all([
    proStatus(profile.id),
    createAdminClient().from("books").select("id, title").eq("author_id", profile.id).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader
        title="Request a promotional creative"
        intro="Template-based creatives for your book, made by our team. One revision each. Credits reset each paid month and don't roll over."
      />
      <div className="card max-w-xl">
        {!status.active ? (
          <p>
            Promotional creatives are part of Pro.{" "}
            <Link href="/author/plan" className="font-medium underline">
              See plans
            </Link>
          </p>
        ) : status.credits <= 0 ? (
          <p>You&apos;ve used this period&apos;s credits. They reset when your next paid month starts. For more, see the Launch Kit in Services.</p>
        ) : !books?.length ? (
          <p>Add a book first.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{status.credits} credit(s) left this period.</p>
            <CreativeForm books={books} />
          </>
        )}
      </div>
    </>
  );
}
