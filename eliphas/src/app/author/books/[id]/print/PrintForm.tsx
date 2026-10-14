"use client";

import { useActionState } from "react";
import { savePrintOptions } from "@/app/actions/books";
import { FormMessage } from "@/components/FormMessage";
import { PrintCalculator, type CalculatorValues } from "@/components/PrintCalculator";
import type { Fees, PrintRates } from "@/lib/pricing";
import { pageSizeMatches } from "@/lib/publishing";

export function PrintForm({
  bookId,
  rates,
  fees,
  initial,
  disabled,
  pdfSize,
}: {
  bookId: string;
  rates: PrintRates;
  fees: Fees;
  initial: CalculatorValues;
  disabled: boolean;
  pdfSize: { w: number; h: number } | null;
}) {
  const [state, action, pending] = useActionState(savePrintOptions.bind(null, bookId), undefined);

  const sizeWarning = (trimKey: string) => {
    const trim = rates.trim_sizes[trimKey];
    if (!pdfSize || !trim || pageSizeMatches(pdfSize.w, pdfSize.h, trim)) return null;
    return `Your PDF pages are ${pdfSize.w} × ${pdfSize.h} in, which doesn't match ${trim.label}. Pick the matching size or re-export your PDF.`;
  };

  return (
    <form action={action} className="space-y-6">
      <PrintCalculator rates={rates} fees={fees} initial={initial} disabled={disabled} sizeWarning={sizeWarning} />
      <FormMessage state={state} />
      {!disabled && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="next" value="1" className="btn-accent" disabled={pending}>
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
