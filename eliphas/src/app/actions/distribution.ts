"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { CHANNELS, REVIEW_STATUSES, channelLabel, statusOf } from "@/lib/distribution";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string; ok?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();

function refresh() {
  revalidatePath("/author/distribution");
  revalidatePath("/admin/distribution");
}

/** An author asks us to review one of their published books for a channel. RLS enforces the same rules. */
export async function requestDistribution(_: State, fd: FormData): Promise<State> {
  const me = await requireRole(["author", "admin"]);
  const book_id = String(fd.get("book_id") ?? "");
  const channel = String(fd.get("channel") ?? "");
  const residence_country = clean(fd.get("residence_country"));
  const markets = clean(fd.get("markets"));

  if (!UUID.test(book_id)) return { error: "Choose one of your published books." };
  if (!Object.hasOwn(CHANNELS, channel)) return { error: "Choose a channel." };
  if (residence_country.length < 2 || residence_country.length > 80) return { error: "Enter your country of residence." };
  if (markets.length < 2 || markets.length > 200)
    return {
      error: "Enter the countries where you want to sell (up to 200 characters).",
    };
  if (fd.get("rights") !== "on")
    return {
      error: "Confirm that you hold the distribution rights for these countries.",
    };

  // A removed book can never be "published" (guarded in migration 000017), so this also excludes removed books
  const db = await createClient();
  const { data: book } = await db.from("books").select("id").eq("id", book_id).eq("author_id", me.id).eq("status", "published").maybeSingle();
  if (!book) return { error: "Choose one of your published books." };

  const { error } = await db.from("distribution_requests").insert({
    author_id: me.id,
    book_id,
    channel,
    markets,
    residence_country,
    rights_confirmed: true,
  });
  if (error) {
    if (error.code === "23505")
      return {
        error: "You’ve already requested this channel for this book. Its status is shown below.",
      };
    console.error("Distribution request failed", error);
    return { error: "We couldn’t save your request. Please try again." };
  }
  refresh();
  return {
    ok: "Request sent. Nothing is charged. We’ll review eligibility and reply here.",
  };
}

/** Admin review. `previous` is the updated_at the admin saw, so an edit made meanwhile isn't overwritten. */
export async function reviewDistribution(_: State, fd: FormData): Promise<State> {
  await requireRole(["admin"]);
  const id = String(fd.get("id") ?? "");
  const previous = String(fd.get("previous") ?? "");
  const status = String(fd.get("status") ?? "");
  const review_note = String(fd.get("review_note") ?? "").trim();
  if (!UUID.test(id) || !previous) return { error: "Refresh the page and try again." };
  if (!REVIEW_STATUSES.some((s) => s === status)) return { error: "Choose a status." };
  if (review_note.length < 5 || review_note.length > 2000) return { error: "Write a note for the author (5–2,000 characters)." };

  const db = await createClient();
  const { data, error } = await db
    .from("distribution_requests")
    .update({ status, review_note })
    .eq("id", id)
    .eq("updated_at", previous)
    .select("id, author_id, channel, books(title)")
    .maybeSingle();
  if (error) {
    console.error("Distribution review failed", error);
    return { error: "We couldn’t save the review. Please try again." };
  }
  if (!data)
    return {
      error: "Someone updated this request after you opened it. Refresh to see the latest version, then try again.",
    };
  // In-app notification only (never SMS or email). A fresh refId, so every review notifies once.
  await notify({
    userId: data.author_id,
    kind: "distribution",
    actorId: null,
    refId: crypto.randomUUID(),
    title: `${data.books?.title ?? "Your book"} · ${channelLabel(data.channel)}: ${statusOf(status).label}`,
    link: "/author/distribution",
  });
  refresh();
  return { ok: "Review saved. The author has been notified and can see your note." };
}

/** Author reply to "Needs information". The database function checks ownership, status and staleness. */
export async function replyDistribution(_: State, fd: FormData): Promise<State> {
  await requireRole(["author", "admin"]);
  const id = String(fd.get("id") ?? "");
  const previous = String(fd.get("previous") ?? "");
  const reply = String(fd.get("reply") ?? "").trim();
  const residence = clean(fd.get("residence_country"));
  const markets = clean(fd.get("markets"));
  if (!UUID.test(id) || !previous) return { error: "Refresh the page and try again." };
  if (reply.length < 5 || reply.length > 2000) return { error: "Write your reply (5–2,000 characters)." };
  if (residence.length < 2 || residence.length > 80) return { error: "Enter your country of residence." };
  if (markets.length < 2 || markets.length > 200) return { error: "Enter the countries where you want to sell (up to 200 characters)." };

  const db = await createClient();
  const { data, error } = await db.rpc("reply_to_distribution_review", {
    p_id: id,
    p_previous: previous,
    p_reply: reply,
    p_markets: markets,
    p_residence: residence,
  });
  if (error) {
    console.error("Distribution reply failed", error);
    return { error: "We couldn’t send your reply. Please try again." };
  }
  if (!data) return { error: "This request changed after you opened it. Refresh to see the latest version." };
  refresh();
  return { ok: "Reply sent. We’ll review it and update you here." };
}
