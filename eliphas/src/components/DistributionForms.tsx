"use client";
import { useState } from "react";
import { requestDistribution, reviewDistribution } from "@/app/actions/distribution";
import { CHANNELS, REVIEW_STATUSES, distributionEstimate } from "@/lib/distribution";
import { useFormAction } from "@/lib/use-form-action";
import { FormMessage } from "@/components/FormMessage";
export function DistributionRequestForm({ books }: { books: { id: string; title: string }[] }) {
 const [state, submit, pending] = useFormAction(requestDistribution);
 return <form onSubmit={submit} className="card space-y-4"><h2 className="text-xl">Request distribution review</h2>
 <label className="block">Published book<select name="book_id" required className="mt-1 w-full"><option value="">Select a book</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
 <label className="block">Channel<select name="channel" className="mt-1 w-full">{Object.entries(CHANNELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
 <label className="block">Country of residence<input name="residence_country" required minLength={2} maxLength={80} placeholder="e.g. India" className="mt-1 w-full" /></label>
 <label className="block">Requested sales countries<input name="markets" required minLength={2} maxLength={200} placeholder="e.g. India, United Kingdom" className="mt-1 w-full" /></label>
 <label className="flex gap-3"><input type="checkbox" name="rights" required />I hold the distribution rights for this edition in the requested countries.</label>
 <p className="text-sm text-muted">No payment now. Retailer approval, partner coverage, pricing and payout eligibility must be checked first. An EEID does not replace an ISBN.</p>
 <FormMessage state={state} /><button className="btn-primary" disabled={pending || !books.length}>{pending ? "Saving…" : "Request review"}</button></form>;
}
export function DistributionReviewForm({ id, updatedAt, status, note }: { id: string; updatedAt: string; status: string; note: string }) {
 const [state, submit, pending] = useFormAction(reviewDistribution);
 return <form onSubmit={submit} className="mt-4 space-y-3"><input type="hidden" name="id" value={id}/><input type="hidden" name="previous" value={updatedAt}/>
 <label className="block">Review status<select name="status" defaultValue={status === "requested" ? "reviewing" : status} className="w-full">{REVIEW_STATUSES.map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
 <label className="block">Note visible to author<textarea name="review_note" defaultValue={note} minLength={5} maxLength={2000} required className="w-full" /></label>
 <FormMessage state={state}/><button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save review"}</button></form>;
}
export function DistributionCalculator() {
 const [values, setValues] = useState([250, 120, 20, 10, 15]);
 const labels = ["Retailer receipts after retailer deductions", "Remaining print, shipping, tax and risk costs", "Proposed platform share (%)", "Platform operating cost per copy", "Minimum contribution per copy"];
 let result; try { result = distributionEstimate(Math.round(values[0]*100),Math.round(values[1]*100),values[2],Math.round(values[3]*100),Math.round(values[4]*100)); } catch { /* render validation below */ }
 const money = (n: number) => (n/100).toFixed(2);
 return <section className="card space-y-4"><h2 className="text-xl">Channel margin calculator</h2><p className="text-sm text-muted">Planning only. All amounts must use one currency and the same tax basis. Do not deduct retailer fees twice. Defaults are examples, not approved prices.</p>
 {labels.map((label,i) => <label key={label} className="block">{label}<input className="w-full" type="number" min="0" max={i === 2 ? 100 : 10000000} step="0.01" value={Number.isNaN(values[i]) ? "" : values[i]} onChange={e => setValues(values.map((v,j) => j === i ? e.target.valueAsNumber : v))}/></label>)}
 {result ? <div aria-live="polite" className="space-y-2"><p>Author estimate: <strong>{money(result.author)}</strong> · Platform share: <strong>{money(result.platform)}</strong></p><p>Contribution after operating cost: <strong>{money(result.contribution)}</strong></p><p className={result.viable ? "notice-success" : "notice-danger"}>{result.viable ? "Meets the entered contribution target." : "Below target — revise the price or costs before offering terms."}</p><p className="text-sm text-muted">Before monthly fixed costs. No automatic quote, charge or royalty change. Returns and exchange rates can change the outcome.</p></div> : <p role="alert">Enter valid non-negative numbers; share must be 0–100%.</p>}</section>;
}
