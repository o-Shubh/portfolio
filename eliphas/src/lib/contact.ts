/** What a contact message is about (stored key → label). */
export const CONTACT_TOPICS = {
  order: "An order",
  publishing: "Publishing my book",
  payout: "Earnings or payouts",
  services: "Author services",
  other: "Something else",
} as const;
export type ContactTopic = keyof typeof CONTACT_TOPICS;
