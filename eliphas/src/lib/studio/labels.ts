// Plain-English labels for Studio statuses (shared by pages and tests).

export const BOOK_STATUS: Record<string, string> = {
  setup: "Setting up",
  blueprint: "Planning the blueprint",
  writing: "Writing chapters",
  review: "Final review",
  complete: "Complete",
};

export const CHAPTER_STATUS: Record<string, string> = {
  not_started: "Not started",
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
  locked: "Locked",
};

export const LANGUAGE: Record<string, string> = { en: "English", hi: "Hindi" };
