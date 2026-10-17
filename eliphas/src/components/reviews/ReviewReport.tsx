"use client";

import { useState } from "react";
import { ReportForm } from "@/components/articles/ReportForm";

export function ReviewReport({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="min-h-9 text-xs font-semibold text-muted hover:text-fg hover:underline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Report
      </button>
      {open && <ReportForm targetType="review" targetId={reviewId} intent="report" onDone={() => setOpen(false)} />}
    </div>
  );
}
