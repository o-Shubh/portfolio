"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type VerifyState = { error?: string; ok?: string } | undefined;

/**
 * Apply (or re-apply after "changes requested") for the Verified Author badge.
 * Asks only for what reviewers need: pen name, bio, language and evidence of authorship (no ID documents).
 * A reader who applies can publish books straight away, as before; the badge comes only from an admin.
 */
export async function applyForVerification(_prev: VerifyState, fd: FormData): Promise<VerifyState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "Log in to apply." };
  if (!me.full_name) return { error: "Finish setting up your account first." };
  if (me.verified_author_at) return { error: "Your author profile is already verified." };
  const pen = String(fd.get("pen_name") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  const language = String(fd.get("language") ?? "");
  const evidence = String(fd.get("evidence") ?? "").trim();
  if (pen.length < 2 || pen.length > 80) return { error: "Enter the name you publish under (2–80 characters)." };
  if (bio.length < 20 || bio.length > 600) return { error: "Write a short bio of 20–600 characters." };
  if (!["en", "hi", "both"].includes(language)) return { error: "Choose the language you write in." };
  if (evidence.length < 10 || evidence.length > 2000) return { error: "Tell us how we can confirm your authorship: book links, ISBNs, or the manuscript you'll publish here (10–2,000 characters)." };
  if (/\b\d{4}\s?\d{4}\s?\d{4}\b/.test(evidence)) return { error: "Please don't include ID numbers such as Aadhaar. Book links or titles are enough." };

  const admin = createAdminClient();
  const { data: open } = await admin.from("author_applications").select("id, status").eq("user_id", me.id).in("status", ["pending", "changes_requested"]).maybeSingle();
  let appId = open?.id;
  if (open) {
    await admin.from("author_applications").update({ pen_name: pen, bio, language, evidence, status: "pending" }).eq("id", open.id);
  } else {
    const { data, error } = await admin.from("author_applications").insert({ user_id: me.id, pen_name: pen, bio, language, evidence }).select("id").single();
    if (error || !data) return { error: "Could not send your application. Please try again." };
    appId = data.id;
  }
  // Applicants can use the author workspace (publishing stays self-service); their bio fills the public profile if empty
  await admin.from("profiles").update({ ...(me.role === "reader" ? { role: "author" as const } : {}), ...(me.bio ? {} : { bio }) }).eq("id", me.id);
  await admin.from("author_verification_events").insert({ user_id: me.id, application_id: appId, status: "pending", note: open ? "Application updated" : "Application sent", actor_id: me.id });
  revalidatePath("/account/verification");
  revalidatePath("/admin/authors");
  return { ok: open ? "Application updated. Our team will review it." : "Application sent. Our team will review it; you'll get a notification with the decision." };
}

const DECISIONS = { approve: "approved", changes: "changes_requested", reject: "rejected" } as const;

/** Admin decision on an application. Approve sets the badge; every decision is logged and notified. */
export async function decideApplication(_prev: VerifyState, fd: FormData): Promise<VerifyState> {
  const me = await requireRole(["admin"]);
  const id = String(fd.get("application_id"));
  const decision = String(fd.get("decision")) as keyof typeof DECISIONS;
  const note = String(fd.get("note") ?? "").trim();
  if (!(decision in DECISIONS)) return { error: "Choose a decision." };
  if (decision !== "approve" && note.length < 5) return { error: "Tell the applicant what to change or why (at least 5 characters)." };
  const admin = createAdminClient();
  const { data: app } = await admin.from("author_applications").select("*").eq("id", id).maybeSingle();
  if (!app || !["pending", "changes_requested"].includes(app.status)) return { error: "This application isn't waiting for a decision." };
  const status = DECISIONS[decision];
  const now = new Date().toISOString();
  await admin.from("author_applications").update({ status, decision_note: note || null, reviewed_by: me.id, reviewed_at: now }).eq("id", id);
  if (status === "approved") {
    await admin.from("profiles").update({ verified_author_at: now, verified_author_by: me.id, role: "author" }).eq("id", app.user_id).neq("role", "admin");
    await admin.from("profiles").update({ verified_author_at: now, verified_author_by: me.id }).eq("id", app.user_id).eq("role", "admin");
  }
  await admin.from("author_verification_events").insert({ user_id: app.user_id, application_id: id, status, note: note || null, actor_id: me.id });
  await logAudit(me.id, `verification.${status}`, "profile", app.user_id, { note });
  const title = status === "approved" ? "Your author profile is verified" : status === "changes_requested" ? "Changes requested on your author application" : "Your author application was not approved";
  await notify({ userId: app.user_id, kind: "verification", actorId: null, refId: crypto.randomUUID(), title, link: "/account/verification" });
  revalidatePath("/admin/authors");
  revalidatePath("/", "layout");
  return { ok: `Marked ${status.replace("_", " ")}.` };
}

/** Verify an existing author directly after reviewing their profile and books (migration review). */
export async function verifyExistingAuthor(_prev: VerifyState, fd: FormData): Promise<VerifyState> {
  const me = await requireRole(["admin"]);
  const userId = String(fd.get("user_id"));
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 5) return { error: "Note what you checked (at least 5 characters)." };
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("id, role, verified_author_at").eq("id", userId).maybeSingle();
  if (!p || !["author", "admin"].includes(p.role)) return { error: "Author not found." };
  if (p.verified_author_at) return { error: "Already verified." };
  const now = new Date().toISOString();
  await admin.from("profiles").update({ verified_author_at: now, verified_author_by: me.id }).eq("id", userId);
  await admin.from("author_verification_events").insert({ user_id: userId, status: "approved", note: `Existing author reviewed: ${note}`, actor_id: me.id });
  await logAudit(me.id, "verification.approved_existing", "profile", userId, { note });
  await notify({ userId, kind: "verification", actorId: null, refId: crypto.randomUUID(), title: "Your author profile is verified", link: "/account/verification" });
  revalidatePath("/admin/authors");
  revalidatePath("/", "layout");
  return { ok: "Verified." };
}

/** Removes the badge (with a reason). Books, articles and posts stay as they are. */
export async function revokeVerification(_prev: VerifyState, fd: FormData): Promise<VerifyState> {
  const me = await requireRole(["admin"]);
  const userId = String(fd.get("user_id"));
  const note = String(fd.get("note") ?? "").trim();
  if (note.length < 5) return { error: "Give a reason (at least 5 characters). It's kept in the log." };
  const admin = createAdminClient();
  await admin.from("profiles").update({ verified_author_at: null, verified_author_by: null }).eq("id", userId);
  await admin.from("author_applications").update({ status: "revoked", decision_note: note, reviewed_by: me.id, reviewed_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "approved");
  await admin.from("author_verification_events").insert({ user_id: userId, status: "revoked", note, actor_id: me.id });
  await logAudit(me.id, "verification.revoked", "profile", userId, { note });
  await notify({ userId, kind: "verification", actorId: null, refId: crypto.randomUUID(), title: "Your Verified Author badge was removed", link: "/account/verification" });
  revalidatePath("/admin/authors");
  revalidatePath("/", "layout");
  return { ok: "Verification removed." };
}
