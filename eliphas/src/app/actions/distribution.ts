"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS, REVIEW_STATUSES } from "@/lib/distribution";
type State = { error?: string; ok?: string } | undefined;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function refresh() { revalidatePath("/author/distribution"); revalidatePath("/admin/distribution"); }
export async function requestDistribution(_: State, fd: FormData): Promise<State> {
 const me = await requireRole(["author", "admin"]);
 const book_id = String(fd.get("book_id") ?? "");
 const channel = String(fd.get("channel") ?? "");
 const markets = String(fd.get("markets") ?? "").trim();
 const residence_country = String(fd.get("residence_country") ?? "").trim();
 if (!idPattern.test(book_id) || !Object.hasOwn(CHANNELS, channel) || markets.length < 2 || markets.length > 200 || residence_country.length < 2 || residence_country.length > 80 || fd.get("rights") !== "on") return { error: "Select a book and channel, enter your country and markets, and confirm distribution rights." };
 const db = await createClient();
 const { data: book } = await db.from("books").select("id").eq("id", book_id).eq("author_id", me.id).eq("status", "published").is("removed_at", null).maybeSingle();
 if (!book) return { error: "Choose one of your currently published books." };
 const { error } = await db.from("distribution_requests").insert({ author_id: me.id, book_id, channel, markets, residence_country, rights_confirmed: true });
 if (error) return { error: error.code === "23505" ? "This book already has a request for this channel. Your existing request is shown below." : "Request could not be saved. Please try again or contact support." };
 refresh(); return { ok: "Request saved. No payment is due. We will review eligibility before offering any distribution terms." };
}
export async function reviewDistribution(_: State, fd: FormData): Promise<State> {
 await requireRole(["admin"]);
 const id = String(fd.get("id") ?? ""), status = String(fd.get("status") ?? ""), previous = String(fd.get("previous") ?? ""), review_note = String(fd.get("review_note") ?? "").trim();
 if (!idPattern.test(id) || !REVIEW_STATUSES.some(s => s === status) || review_note.length < 5 || review_note.length > 2000) return { error: "Choose a review status and write a note of 5–2,000 characters." };
 const db = await createClient();
 const { data, error } = await db.from("distribution_requests").update({ status, review_note, updated_at: new Date().toISOString() }).eq("id", id).eq("updated_at", previous).select("id").maybeSingle();
 if (error || !data) return { error: "The request changed or could not be updated. Refresh and try again." };
 refresh(); return { ok: "Review saved. The author can see your note." };
}
