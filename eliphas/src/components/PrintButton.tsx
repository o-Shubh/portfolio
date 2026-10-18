"use client";

import { Printer } from "lucide-react";

/** Opens the browser's print dialog (print styles hide the site chrome). */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost min-h-11 gap-2 px-3 text-sm pointer-fine:min-h-9 print:hidden">
      <Printer className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
