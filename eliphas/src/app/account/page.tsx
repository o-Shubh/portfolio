import type { Metadata } from "next";
import { becomeAuthor } from "@/app/actions/profile";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "My orders" };

export default async function AccountHome() {
  const profile = await requireRole(["reader", "author", "printer", "admin"]);

  return (
    <>
      <PageHeader title={`Namaste, ${profile.full_name?.split(" ")[0]}`} intro="Your book orders will appear here." />
      <div className="card text-muted">You haven&apos;t ordered any books yet.</div>

      {profile.role === "reader" && (
        <div className="card mt-6 ring-2 ring-marigold/50">
          <h2 className="text-xl font-semibold">Have a book in you?</h2>
          <p className="mt-1 text-muted">
            Publish in print across India. No upfront cost — we print each copy when someone orders it.
          </p>
          <form action={becomeAuthor} className="mt-4">
            <button type="submit" className="btn-accent">
              Start publishing
            </button>
          </form>
        </div>
      )}
    </>
  );
}
