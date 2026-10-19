"use client";

import { updateContactMessage } from "@/app/actions/contact";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function MessageForm({ id, status, note }: { id: string; status: string; note: string }) {
  const [state, submit, pending] = useFormAction(updateContactMessage.bind(null, id));
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={`note-${id}`} className="label">
          Private note
        </label>
        <input id={`note-${id}`} name="admin_note" defaultValue={note} maxLength={2000} className="field" placeholder="What you replied or did" />
      </div>
      <div>
        <label htmlFor={`status-${id}`} className="label">
          Status
        </label>
        <select id={`status-${id}`} name="status" defaultValue={status === "new" ? "replied" : status} className="field w-auto">
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
