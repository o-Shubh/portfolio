import { PageHeader } from "@/components/PageHeader";
import { DistributionRequestForm } from "@/components/DistributionForms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS } from "@/lib/distribution";
export default async function DistributionPage() {
 const me = await requireRole(["author", "admin"]); const db = await createClient();
 const [books, requests] = await Promise.all([
 db.from("books").select("id,title").eq("author_id",me.id).eq("status","published").is("removed_at",null),
 db.from("distribution_requests").select("*").eq("author_id",me.id).order("created_at",{ascending:false}).limit(100)]);
 return <><PageHeader title="Reach more readers" intro="Request a review for Amazon India, Flipkart or international distribution. External channels are pending setup; submitting a request does not publish your book elsewhere."/><div className="max-w-3xl space-y-6">
 {books.error || requests.error ? <p className="notice-danger" role="alert">Distribution requests are temporarily unavailable. Please contact support.</p> : <><DistributionRequestForm books={books.data ?? []}/><section className="space-y-4"><h2 className="text-xl">Your latest requests</h2>{!requests.data?.length && <p className="text-muted">No requests yet. Publish a book in the Eliphas store to get started.</p>}{requests.data?.map(r => <article key={r.id} className="card space-y-2"><h3>{books.data?.find(b=>b.id===r.book_id)?.title ?? "Book"} · {CHANNELS[r.channel as keyof typeof CHANNELS]}</h3><p className="capitalize">{r.status.replaceAll("_"," ")}</p><p className="text-sm text-muted">Requested markets: {r.markets}</p><p className="whitespace-pre-wrap">{r.review_note || "Waiting for eligibility review. No charge has been made."}</p></article>)}</section></>}
 </div></>;
}
