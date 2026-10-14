// Frequently asked questions. Edit freely — the FAQ page and homepage read from here.
// Answers that promise timelines or payout schedules are business decisions: check them before launch.

export type Faq = { q: string; a: string };
export type FaqGroup = { title: string; items: Faq[] };

export const FAQ: FaqGroup[] = [
  {
    title: "Publishing",
    items: [
      {
        q: "How much does it cost to publish?",
        a: "Nothing upfront. There is no setup fee and no minimum order. A small amount is taken only when a copy sells: the print cost, a ₹15 platform fee and the payment gateway charge. The rest is yours.",
      },
      {
        q: "What do I need to get started?",
        a: "Your manuscript as a print-ready PDF and a cover (PDF or image). Log in with your mobile number, fill in the book details, upload both files, choose size and paper, set your price, and send it for review.",
      },
      {
        q: "Can I publish in Hindi?",
        a: "Yes. We publish in Hindi and English. Make sure fonts are embedded in your PDF so Devanagari prints correctly.",
      },
      {
        q: "How long does review take?",
        a: "Usually 2–3 working days. If something needs fixing — margins, image quality, missing pages — we send the book back with a clear note so you can update and resubmit.",
      },
      {
        q: "Do I keep the rights to my book?",
        a: "Yes. You own your book. You can update it, change the price or take it down from your dashboard.",
      },
      {
        q: "Do I need an ISBN?",
        a: "No, it is optional. If you want one, ISBNs in India are issued free of charge by the Raja Rammohun Roy National Agency for ISBN (isbn.gov.in). Add it to your book details.",
      },
    ],
  },
  {
    title: "Money",
    items: [
      {
        q: "How much will I earn per copy?",
        a: "Earning per copy = MRP − print cost − ₹15 platform fee − payment charges. You see the exact figure live while you set your price, before you publish. See the Pricing page for examples.",
      },
      {
        q: "When do I get paid?",
        a: "Earnings are paid to your UPI ID or bank account. Payout dates and the amount due are shown in your author dashboard.",
      },
      {
        q: "Can I change the price later?",
        a: "Yes. Price changes apply to new orders only. Orders already placed keep the price at the time of purchase.",
      },
    ],
  },
  {
    title: "Printing and delivery",
    items: [
      {
        q: "What is print on demand?",
        a: "Each copy is printed only when a reader orders it. You don't pay for stock, nothing sits in a warehouse, and your book never goes out of print.",
      },
      {
        q: "How long does delivery take?",
        a: "Books are printed by our partner presses in India and usually reach readers within 5–9 working days, depending on the city.",
      },
      {
        q: "Can I order copies for myself?",
        a: "Yes. Order from the bookstore like any reader. Your earning on your own order comes back to you, so you effectively pay the print cost plus fees.",
      },
    ],
  },
];
