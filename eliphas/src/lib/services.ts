import type { Database } from "@/lib/database.types";

export type ServiceStatus = Database["public"]["Enums"]["service_status"];
export type ServiceOrder = Database["public"]["Tables"]["service_orders"]["Row"];
export type ServiceQuote = Database["public"]["Tables"]["service_quotes"]["Row"];
export type CatalogItem = Database["public"]["Tables"]["service_catalog"]["Row"];

export const SERVICE_STATUS: Record<ServiceStatus, { label: string; author: string; tone: string }> = {
  requirements_pending: { label: "Requirements needed", author: "Fill in the details and upload your files, then submit.", tone: "bg-accent/20 text-fg" },
  scope_review: { label: "Scope review", author: "We're checking your files and requirements. You'll get a fixed quote before paying.", tone: "bg-surface-2 text-muted" },
  quote_awaiting_acceptance: { label: "Quote ready", author: "Review the quote. Nothing is charged until you accept and pay.", tone: "bg-accent/20 text-fg" },
  payment_pending: { label: "Awaiting payment", author: "Pay to start the work.", tone: "bg-accent/20 text-fg" },
  queued: { label: "Queued", author: "Paid. Work starts soon; the delivery date in your quote applies.", tone: "bg-surface-2 text-muted" },
  in_progress: { label: "In progress", author: "Our team is working on it.", tone: "bg-surface-2 text-muted" },
  author_review: { label: "Ready for your review", author: "Check the files. Approve them, or request an included revision.", tone: "bg-accent/20 text-fg" },
  revision_requested: { label: "Revision requested", author: "We're making your requested changes.", tone: "bg-surface-2 text-muted" },
  completed: { label: "Completed", author: "Approved. Your final files are below.", tone: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", author: "This order was cancelled.", tone: "bg-danger/15 text-danger" },
  refunded: { label: "Refunded", author: "This order was cancelled and refunded.", tone: "bg-danger/15 text-danger" },
};

export const OPEN_SERVICE_STATUSES: ServiceStatus[] = [
  "requirements_pending",
  "scope_review",
  "quote_awaiting_acceptance",
  "payment_pending",
  "queued",
  "in_progress",
  "author_review",
  "revision_requested",
];

/** Statuses where the author still has something to do. */
export const AUTHOR_ACTION_STATUSES: ServiceStatus[] = ["requirements_pending", "quote_awaiting_acceptance", "payment_pending", "author_review"];

export type RequirementField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  hint?: string;
  options?: { value: string; label: string }[];
};

/** Everything we may ask for. Each catalogue item lists which keys are required. */
export const REQUIREMENT_FIELDS: RequirementField[] = [
  { key: "title", label: "Book title", type: "text" },
  { key: "author_name", label: "Author name (as on the cover)", type: "text" },
  {
    key: "language",
    label: "Language",
    type: "select",
    options: [
      { value: "en", label: "English" },
      { value: "hi", label: "Hindi" },
    ],
  },
  { key: "genre", label: "Genre", type: "text" },
  { key: "trim_size", label: "Trim size", type: "text", hint: "e.g. 5 × 8 in" },
  { key: "page_count", label: "Final page count (if known)", type: "number", hint: "For covers we confirm this before the final wrap" },
  { key: "paper", label: "Paper", type: "text", hint: "e.g. Cream 70 GSM" },
  { key: "printer_spec", label: "Printer template or specifications", type: "textarea", hint: "Paste the printer's cover template details if you have them" },
  { key: "manuscript_words", label: "Manuscript length (words)", type: "number" },
  { key: "complexity", label: "Anything complex?", type: "textarea", hint: "Tables, equations, images, footnotes, poetry layout…" },
  { key: "blurb", label: "Back-cover blurb", type: "textarea" },
  { key: "bio", label: "Author bio", type: "textarea" },
  { key: "preferences", label: "Design preferences", type: "textarea", hint: "Colours, mood, covers you like, things to avoid" },
  { key: "output_formats", label: "Output formats you need", type: "text", hint: "e.g. print PDF, PNG for Instagram" },
];

export const QC_ITEMS = [
  { key: "dimensions", label: "Dimensions match trim size / template" },
  { key: "bleed", label: "Bleed and safe margins correct" },
  { key: "spine", label: "Spine width matches final page count and paper" },
  { key: "fonts", label: "Fonts embedded / outlined" },
  { key: "images", label: "Images at print resolution (300 dpi)" },
  { key: "licences", label: "All fonts, images and assets licensed for this use" },
] as const;

/** Allowed status moves. Anything else is refused. */
export const TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  requirements_pending: ["scope_review", "cancelled"],
  scope_review: ["quote_awaiting_acceptance", "requirements_pending", "cancelled"],
  quote_awaiting_acceptance: ["payment_pending", "scope_review", "cancelled"],
  payment_pending: ["queued", "quote_awaiting_acceptance", "cancelled"],
  queued: ["in_progress", "cancelled", "refunded"],
  in_progress: ["author_review", "cancelled", "refunded"],
  author_review: ["revision_requested", "completed", "quote_awaiting_acceptance", "cancelled", "refunded"],
  revision_requested: ["in_progress", "author_review", "cancelled", "refunded"],
  completed: ["quote_awaiting_acceptance"],
  cancelled: [],
  refunded: [],
};

export const canMove = (from: ServiceStatus, to: ServiceStatus) => TRANSITIONS[from].includes(to);

/** Requirement keys still empty for this catalogue item. */
export function missingRequirements(required: string[], reqs: Record<string, unknown>): string[] {
  return required.filter((k) => {
    const v = reqs[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

/** Services that can't be quoted without the manuscript file. */
export const NEEDS_MANUSCRIPT = new Set(["formatting", "bundle"]);
