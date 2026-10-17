"use client";

import { useFormAction } from "@/lib/use-form-action";
import { savePrintOptions } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import { PrintCalculator, type CalculatorPlan, type CalculatorValues } from "@/components/PrintCalculator";
import type { PrintRates } from "@/lib/pricing";
import { pageSizeMatches } from "@/lib/publishing";

export function PrintForm({
  bookId,
  rates,
  gatewayPercent,
  plans,
  initial,
  disabled,
  pdfSize,
}: {
  bookId: string;
  rates: PrintRates;
  gatewayPercent: number;
  plans: CalculatorPlan[];
  initial: CalculatorValues;
  disabled: boolean;
  pdfSize: { w: number; h: number } | null;
}) {
  const [state, onSubmit, pending, { onChange }] = useFormAction(savePrintOptions.bind(null, bookId), { warnUnsaved: true });

  const sizeWarning = (trimKey: string) => {
    const trim = rates.trim_sizes[trimKey];
    if (!pdfSize || !trim || pageSizeMatches(pdfSize.w, pdfSize.h, trim)) return null;
    return `Your PDF pages are ${pdfSize.w} × ${pdfSize.h} in, which doesn't match ${trim.label}. Pick the matching size or re-export your PDF.`;
  };

  return (
    <form onSubmit={onSubmit} onChange={onChange} className="space-y-6">
      <PrintCalculator rates={rates} gatewayPercent={gatewayPercent} plans={plans} initial={initial} disabled={disabled} sizeWarning={sizeWarning} />
      <FormMessage state={state} />
      {!disabled && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="next" value="1" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </button>
          <button type="submit" className="btn-ghost" disabled={pending}>
            Save
          </button>
        </div>
      )}
    </form>
  );
}
