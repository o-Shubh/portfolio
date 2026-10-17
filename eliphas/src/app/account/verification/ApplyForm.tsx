"use client";

import Link from "next/link";
import { applyForVerification } from "@/app/actions/verification";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function ApplyForm({ initial }: { initial: { pen_name: string; bio: string; language: string; evidence: string } }) {
  const [state, onSubmit, pending, { onChange }] = useFormAction(applyForVerification, { warnUnsaved: true });
  return (
    <form onSubmit={onSubmit} onChange={onChange} className="card space-y-4">
      <div>
        <label htmlFor="pen_name" className="label">
          Pen name or display name
        </label>
        <input id="pen_name" name="pen_name" className="field" defaultValue={initial.pen_name} maxLength={80} required />
      </div>
      <div>
        <label htmlFor="v-bio" className="label">
          Short bio
        </label>
        <textarea id="v-bio" name="bio" rows={3} maxLength={600} className="field py-3" defaultValue={initial.bio} required />
        <p className="hint">Shown on your public profile. 20–600 characters.</p>
      </div>
      <div>
        <label htmlFor="v-lang" className="label">
          Writing language
        </label>
        <select id="v-lang" name="language" className="field" defaultValue={initial.language || "en"}>
          <option value="en">English</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="both">Both</option>
        </select>
      </div>
      <div>
        <label htmlFor="v-evidence" className="label">
          How can we confirm you&apos;re the author?
        </label>
        <textarea id="v-evidence" name="evidence" rows={4} maxLength={2000} className="field py-3" defaultValue={initial.evidence} required />
        <p className="hint">Links to your published books, ISBNs, a publisher or magazine page, or the manuscript you&apos;re publishing here. Please don&apos;t send ID documents or numbers. <Link href="/community-guidelines" className="underline underline-offset-2">How verification works</Link></p>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send application"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
