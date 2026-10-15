"use client";

import { useTransition } from "react";
import { endShippingPromotion, saveShippingPromotion, saveShippingZone } from "@/app/actions/admin-money";
import { FormMessage } from "@/components/FormMessage";
import { useFormAction } from "@/lib/use-form-action";

export function ZoneForm({
  zone,
}: {
  zone: { id: string; name: string; prefixes: string[]; extra: number; active: boolean; is_sample: boolean; slabs: { w: number; p: number }[] } | null;
}) {
  const [state, onSubmit, pending] = useFormAction(saveShippingZone.bind(null, zone?.id ?? null));
  const allIndia = zone ? zone.prefixes.includes("") : false;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Zone name</span>
          <input name="name" defaultValue={zone?.name ?? ""} className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">PIN-code prefixes (comma separated)</span>
          <input name="prefixes" defaultValue={zone?.prefixes.filter(Boolean).join(", ") ?? ""} className="field" placeholder="110, 1220, 201301" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="label">Weight slabs: grams = rupees, one per line</span>
          <textarea name="slabs" rows={3} defaultValue={zone?.slabs.map((s) => `${s.w} = ${s.p / 100}`).join("\n") ?? "500 = 60\n1000 = 80"} className="field py-2.5" />
        </label>
        <label className="block">
          <span className="label">Each extra 500 g above the top slab (₹)</span>
          <input name="extra" defaultValue={zone ? String(zone.extra / 100) : "30"} className="field" />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="all_india" defaultChecked={allIndia} className="h-4 w-4 accent-fg" /> Covers every PIN code (fallback)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={zone?.active ?? true} className="h-4 w-4 accent-fg" /> Active
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_sample" defaultChecked={zone?.is_sample ?? false} className="h-4 w-4 accent-fg" /> Sample rates (not from a courier yet)
        </label>
      </div>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {zone ? "Save zone" : "Add zone"}
      </button>
    </form>
  );
}

export function PromotionForm() {
  const [state, onSubmit, pending] = useFormAction(saveShippingPromotion);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Name (readers see it)</span>
          <input name="name" className="field" placeholder="Launch week free delivery" />
        </label>
        <label className="block">
          <span className="label">Type</span>
          <select name="kind" className="field">
            <option value="free">Free shipping</option>
            <option value="flat_off">Fixed amount off</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Amount off (₹, for fixed)</span>
          <input name="amount" className="field" />
        </label>
        <label className="block">
          <span className="label">Minimum books value (₹)</span>
          <input name="min_books" className="field" defaultValue="0" />
        </label>
        <label className="block">
          <span className="label">Starts</span>
          <input name="starts_at" type="datetime-local" className="field" />
        </label>
        <label className="block">
          <span className="label">Ends (optional)</span>
          <input name="ends_at" type="datetime-local" className="field" />
        </label>
      </div>
      <p className="text-xs text-muted">Promotions are funded by the platform. They are recorded on each order and never reduce author earnings.</p>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        Add promotion
      </button>
    </form>
  );
}

export function EndPromotion({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="text-sm text-danger underline" disabled={pending} onClick={() => start(async () => void (await endShippingPromotion(id)))}>
      End now
    </button>
  );
}
