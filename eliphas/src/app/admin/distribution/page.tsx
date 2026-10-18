import { PageHeader } from "@/components/PageHeader";
import { DistributionCalculator, DistributionReviewForm } from "@/components/DistributionForms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS } from "@/lib/distribution";
export default async function DistributionAdminPage() {
 await requireRole(["admin"]); const db=await createClient();
 const {data,error}=await db.from("distribution_requests").select("*").order("created_at",{ascending:false}).limit(100);
 const ids=[...new Set((data??[]).map(r=>r.book_id))];
 const books=ids.length ? await db.from("books").select("id,title,author_name").in("id",ids) : {data:[]};
 return <><PageHeader title="Distribution review" intro="Assisted intake only. No retailer credentials, submissions, payments or international payouts are connected by this feature."/><div className="grid items-start gap-6 lg:grid-cols-2"><section className="space-y-4"><h2 className="text-xl">Latest 100 requests</h2>{error ? <p role="alert" className="notice-danger">Could not load requests. Check the distribution migration and database connection.</p> : !data?.length ? <p>No requests yet.</p> : data.map(r=><article className="card" key={r.id}><h3 className="text-lg">{books.data?.find(b=>b.id===r.book_id)?.title ?? r.book_id}</h3><p>{books.data?.find(b=>b.id===r.book_id)?.author_name} · {CHANNELS[r.channel as keyof typeof CHANNELS]}</p><p className="text-sm text-muted">Residence: {r.residence_country} · Markets: {r.markets}</p><p>Current status: {r.status.replaceAll("_"," ")}</p><DistributionReviewForm id={r.id} updatedAt={r.updated_at} status={r.status} note={r.review_note}/></article>)}</section><DistributionCalculator/></div></>;
}
