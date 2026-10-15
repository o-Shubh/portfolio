"use client";

import { saveCatalogVersion } from "@/app/actions/admin-money";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

type Item = {
  code: string;
  version: number;
  name: string;
  pricing: string;
  price_paise: number | null;
  min_paise: number | null;
  max_paise: number | null;
  gst_percent: number;
  revision_rounds: number;
  deliverables: string[];
  scope: string;
  exclusions: string[];
  active: boolean;
};

export function CatalogForm({ item }: { item: Item }) {
  const [state, onSubmit, pending] = useFormAction(saveCatalogVersion.bind(null, item.code));
  const r = (p: number | null) => (p === null ? "" : String(p / 100));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <L label="Name" className="sm:col-span-2">
          <input name="name" defaultValue={item.name} className="field" />
        </L>
        {item.pricing === "fixed" ? (
          <L label="Price (₹, before GST)">
            <input name="price" defaultValue={r(item.price_paise)} className="field" />
          </L>
        ) : (
          <>
            <L label="From (₹)">
              <input name="min" defaultValue={r(item.min_paise)} className="field" />
            </L>
            <L label="To (₹)">
              <input name="max" defaultValue={r(item.max_paise)} className="field" />
            </L>
          </>
        )}
        <L label="GST %">
          <input name="gst_percent" defaultValue={item.gst_percent} className="field" />
        </L>
        <L label="Revision rounds">
          <input name="revision_rounds" defaultValue={item.revision_rounds} className="field" />
        </L>
      </div>
      <L label="Scope (shown to authors)">
        <textarea name="scope" rows={3} defaultValue={item.scope} className="field py-2.5" />
      </L>
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Deliverables (one per line)">
          <textarea name="deliverables" rows={4} defaultValue={item.deliverables.join("\n")} className="field py-2.5" />
        </L>
        <L label="Exclusions (one per line)">
          <textarea name="exclusions" rows={4} defaultValue={item.exclusions.join("\n")} className="field py-2.5" />
        </L>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={item.active} className="h-5 w-5 accent-fg" /> Offered to authors
      </label>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Save as version {item.version + 1}
      </button>
    </form>
  );
}

function L({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
