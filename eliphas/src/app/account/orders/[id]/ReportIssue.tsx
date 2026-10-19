"use client";

import { useState } from "react";
import { reportIssue } from "@/app/actions/issues";
import { FormMessage } from "@/components/FormMessage";
import { createClient } from "@/lib/supabase/client";
import { useFormAction } from "@/lib/use-form-action";

/** Report a damaged, misprinted, wrong or missing book, with optional photos. */
export function ReportIssue({ orderId, userId, shippedOnly }: { orderId: string; userId: string; shippedOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [upErr, setUpErr] = useState<string>();
  const [state, onSubmit, pending] = useFormAction(reportIssue.bind(null, orderId));
  if (state?.ok) return <FormMessage state={state} />;
  if (!open)
    return (
      <button type="button" className="btn-ghost w-full" onClick={() => setOpen(true)}>
        {shippedOnly ? "Parcel not arrived?" : "Report a problem with this order"}
      </button>
    );
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUpErr(undefined);
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024)
      return setUpErr("Photos must be JPG, PNG or WebP, up to 5 MB.");
    const path = `${userId}/${orderId}/${crypto.randomUUID()}.${f.type.split("/")[1]}`;
    const { error } = await createClient().storage.from("issue-photos").upload(path, f, { contentType: f.type });
    if (error) return setUpErr("Upload failed. Try again.");
    setPhotos((p) => [...p, path]);
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
      <input type="hidden" name="photos" value={photos.join("\n")} />
      <label className="block">
        <span className="label">What went wrong?</span>
        <select name="kind" className="field" defaultValue={shippedOnly ? "not_delivered" : ""}>
          {!shippedOnly && <option value="">Choose</option>}
          {!shippedOnly && <option value="damaged">Book arrived damaged</option>}
          {!shippedOnly && <option value="misprint">Printing fault (missing or blank pages, wrong binding)</option>}
          {!shippedOnly && <option value="wrong_item">Wrong book</option>}
          <option value="not_delivered">Parcel hasn&apos;t arrived</option>
        </select>
      </label>
      <label className="block">
        <span className="label">Details</span>
        <textarea name="description" rows={3} className="field py-2.5" />
      </label>
      {!shippedOnly && (
        <label className="block">
          <span className="label">Photos (optional, up to 5)</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={photos.length >= 5} className="block text-sm" />
          {photos.length > 0 && <span className="text-xs text-muted">{photos.length} photo(s) added</span>}
          {upErr && <span className="block text-xs text-danger">{upErr}</span>}
        </label>
      )}
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Send
      </button>
    </form>
  );
}
