"use client";

import { useFormAction } from "@/lib/use-form-action";
import { savePrinter } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import type { Database } from "@/lib/database.types";
import { INDIAN_STATES } from "@/lib/india";

type Printer = Database["public"]["Tables"]["printers"]["Row"];

export function PrinterForm({ printer }: { printer: Printer | null }) {
  const [state, onSubmit, pending] = useFormAction(savePrinter.bind(null, printer?.id ?? null));
  const v = printer;
  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Print shop name
        </label>
        <input id="name" name="name" className="field" defaultValue={v?.name ?? ""} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact_name" className="label">
            Contact person
          </label>
          <input id="contact_name" name="contact_name" className="field" defaultValue={v?.contact_name ?? ""} />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Mobile number (for login)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            className="field"
            defaultValue={v?.phone ? v.phone.slice(-10) : ""}
            placeholder="98765 43210"
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="address" className="label">
          Address
        </label>
        <textarea id="address" name="address" rows={2} className="field py-3" defaultValue={v?.address ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className="label">
            City
          </label>
          <input id="city" name="city" className="field" defaultValue={v?.city ?? ""} required />
        </div>
        <div>
          <label htmlFor="state" className="label">
            State
          </label>
          <select id="state" name="state" className="field" defaultValue={v?.state ?? ""} required>
            <option value="" disabled>
              Choose
            </option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pincode" className="label">
            PIN code
          </label>
          <input id="pincode" name="pincode" inputMode="numeric" maxLength={6} className="field" defaultValue={v?.pincode ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="active" defaultChecked={v?.active ?? true} className="h-5 w-5 accent-fg" />
        <span>
          <span className="font-semibold">Active</span>
          <span className="block text-sm text-muted">Paused printers don&apos;t get new orders.</span>
        </span>
      </label>
      <FormMessage state={state} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : printer ? "Save changes" : "Add printer"}
      </button>
    </form>
  );
}
