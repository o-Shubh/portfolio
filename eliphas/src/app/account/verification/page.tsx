import { BadgeCheck, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { VERIFIED_NOTE, VerifiedBadge } from "@/components/VerifiedBadge";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = { title: "Author verification", robots: { index: false } };

const STATUS: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Not approved",
  revoked: "Badge removed",
};

export default async function VerificationPage() {
  const me = await requireRole(["reader", "author", "printer", "admin"]);
  const admin = createAdminClient();
  const [{ data: apps }, { data: events }] = await Promise.all([
    admin.from("author_applications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }),
    admin.from("author_verification_events").select("status, note, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const latest = apps?.[0];
  const canApply = !me.verified_author_at && (!latest || ["changes_requested", "rejected", "revoked"].includes(latest.status));

  return (
    <>
      <PageHeader
        title="Author verification"
        intro="Get the Verified Author badge on your profile, posts and articles. Verification is free and separate from Author Pro."
      />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          {me.verified_author_at ? (
            <section className="notice-success">
              <BadgeCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-semibold">Your author profile is verified</p>
                <p className="mt-1">
                  Since {new Date(me.verified_author_at).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}. <VerifiedBadge />
                </p>
              </div>
            </section>
          ) : latest?.status === "pending" ? (
            <section className="notice-info">
              <Clock className="h-5 w-5 shrink-0 text-muted" aria-hidden />
              <div>
                <p className="font-semibold">Waiting for review</p>
                <p className="mt-1 text-muted">
                  You can keep reading, posting in Community and publishing books while we review. We&apos;ll send a notification with the decision.
                </p>
              </div>
            </section>
          ) : latest && ["changes_requested", "rejected", "revoked"].includes(latest.status) ? (
            <section className="notice-danger">
              <XCircle className="h-5 w-5 shrink-0 text-danger" aria-hidden />
              <div>
                <p className="font-semibold">{STATUS[latest.status]}</p>
                {latest.decision_note && <p className="mt-1">Note from our team: {latest.decision_note}</p>}
                {latest.status !== "revoked" && <p className="mt-1 text-muted">Update your details below and send them again.</p>}
              </div>
            </section>
          ) : null}

          {canApply && (
            <ApplyForm
              initial={{
                pen_name: latest?.pen_name ?? me.full_name ?? "",
                bio: latest?.bio ?? me.bio ?? "",
                language: latest?.language ?? "en",
                evidence: latest?.evidence ?? "",
              }}
            />
          )}

          <p className="text-sm text-muted">
            {VERIFIED_NOTE} Verified authors can publish long-form articles and link their books to posts. Your evidence is seen only by our team.
          </p>

          {(events ?? []).length > 0 && (
            <section aria-labelledby="hist-h">
              <h2 id="hist-h" className="text-lg">
                History
              </h2>
              <ul className="group-list mt-2">
                {(events ?? []).map((e, i) => (
                  <li key={i} className="px-4 py-3 text-sm">
                    <span className="font-medium">{STATUS[e.status] ?? e.status}</span>
                    <span className="text-muted">
                      {" "}
                      · {new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                    </span>
                    {e.note && <span className="block text-muted">{e.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24" aria-labelledby="checks-h">
          <h2 id="checks-h" className="text-lg">
            What helps
          </h2>
          <ul className="space-y-3 text-[0.9375rem]">
            <li>
              <span className="block font-medium">Links to your work</span>
              <span className="text-sm text-muted">A published book, an ISBN, or a publisher or magazine page with your name.</span>
            </li>
            <li>
              <span className="block font-medium">The same name</span>
              <span className="text-sm text-muted">Use the pen name readers know you by.</span>
            </li>
            <li>
              <span className="block font-medium">No ID documents</span>
              <span className="text-sm text-muted">We never ask for Aadhaar, PAN or other ID numbers.</span>
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
