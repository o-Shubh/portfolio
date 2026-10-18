// Sample work shown with each author service. These are fictional, AI-assisted portfolio pieces
// (a made-up book, "The Quiet Courage" by "Aarav Mehta"): they illustrate the style of the deliverables,
// are never client work, and never appear in the bookstore. Prices and scope come from the service catalogue.

export type SampleImage = {
  src: string;
  thumb: string;
  width: number;
  height: number;
  /** Short name shown under the image in the gallery */
  label: string;
  /** Full description for screen readers */
  alt: string;
  /** Optional sample caption text (launch creatives) */
  caption?: string;
};

export type ServicePortfolio = {
  samples: SampleImage[];
  /** One line on what the samples show */
  intro: string;
  /** Extra honest note shown with the samples */
  note?: string;
  /** Before/after pages shown side by side, with PDF downloads */
  beforeAfter?: { before: SampleImage; after: SampleImage[]; beforePdf: string; afterPdf: string };
};

export const SAMPLE_LABEL = "Sample work — fictional book and author. AI-assisted design.";
export const DELIVERY_NOTE = "Delivery timeline is confirmed after reviewing your requirements.";
export const NOT_INCLUDED_NOTE = "Not included unless separately quoted: editing, proofreading, printing, shipping, paid advertising and guaranteed sales.";

const img = (name: string, width: number, height: number, label: string, alt: string, caption?: string): SampleImage => ({
  src: `/samples/${name}.webp`,
  thumb: `/samples/${name}-thumb.webp`,
  width,
  height,
  label,
  alt,
  caption,
});

const cover = {
  front: img("cover-front", 1067, 1600, "Front cover", "Sample front cover for the fictional book The Quiet Courage by Aarav Mehta: a lone walker on a mountain path at sunrise."),
  wrap: img("cover-wrap", 1600, 1152, "Full wrap: back, spine and front", "Sample full paperback wrap for The Quiet Courage showing the back cover with blurb, the spine and the front cover."),
  mockup: img("cover-mockup", 1024, 1536, "Book mockup", "Sample 3D paperback mockup of The Quiet Courage."),
};

const format = {
  before: img("format-before", 1067, 1600, "Before: unformatted manuscript page", "Sample manuscript page before formatting: plain text with no chapter styling."),
  chapter: img("format-after-chapter", 1067, 1600, "After: chapter opening", "Sample formatted chapter opening titled The First Step, with a chapter label, heading, body text and page number."),
  pull: img("format-after-pullquote", 1067, 1600, "After: page with pull quote", "Sample formatted interior page with a running header, body text and a highlighted pull quote."),
};

/** The cover and formatting samples, for showing on public pages (always with SAMPLE_LABEL). */
export const SAMPLE_IMAGES = { cover, format };

const CREATIVES = [
  {
    key: "reveal",
    name: "Cover reveal",
    alt: "cover reveal post reading A story is taking shape, with the book cover",
    caption: "Meet The Quiet Courage. A fictional sample about small steps and everyday strength. What helps you begin?",
  },
  {
    key: "announce",
    name: "Launch announcement",
    alt: "launch announcement post reading Your next chapter awaits, with the book cover",
    caption: "Introducing The Quiet Courage. Explore the sample and meet the story behind the cover. [Insert approved book link]",
  },
  {
    key: "quote",
    name: "Quote card",
    alt: "quote card on navy reading Courage begins with one small step",
    caption: "One small step can be enough for today. Save this reminder for a day when beginning feels difficult.",
  },
  {
    key: "meet",
    name: "Book introduction",
    alt: "book introduction post reading For the days you need a beginning, with the book cover",
    caption: "A reflective read about hesitation, patience and finding the courage to start. Read the sample before choosing your next book.",
  },
  {
    key: "buy",
    name: "Buy-now post",
    alt: "buy-now post reading Make room for a new perspective, with the book cover",
    caption: "Discover The Quiet Courage by Aarav Mehta. Read a sample and see the price and delivery details on the book page. [Insert approved book link]",
  },
];

const launch: SampleImage[] = CREATIVES.flatMap((c) => [
  img(`launch-${c.key}-feed`, 1080, 1350, `${c.name} · feed (4:5)`, `Sample ${c.alt}, feed size.`, c.caption),
  img(`launch-${c.key}-story`, 900, 1600, `${c.name} · story (9:16)`, `Sample ${c.alt}, story size.`, c.caption),
]);

export const SERVICE_PORTFOLIO: Record<string, ServicePortfolio> = {
  basic_cover: {
    intro: "A front cover, the full paperback wrap and a promotional mockup.",
    note: "The sample wrap is a visual concept, not a print-ready template. Your final cover is built to your printer's trim size, bleed, paper and spine width.",
    samples: [cover.front, cover.wrap, cover.mockup],
  },
  formatting: {
    intro: "The same prose before and after formatting. The after sample adds a pull quote.",
    samples: [format.before, format.chapter, format.pull],
    beforeAfter: {
      before: format.before,
      after: [format.chapter, format.pull],
      beforePdf: "/samples/formatting-sample-before.pdf",
      afterPdf: "/samples/formatting-sample-after.pdf",
    },
  },
  launch_kit: {
    intro: "Five sample designs, each in feed and story sizes, with a caption for each.",
    note: "Sample captions use placeholder links. Yours use your approved book link.",
    samples: launch,
  },
  bundle: {
    intro: "Cover, interior formatting and launch creatives for one book.",
    note: "The sample wrap is a visual concept, not a print-ready template.",
    samples: [cover.front, cover.wrap, cover.mockup, format.chapter, format.pull, ...launch.filter((_, i) => i % 2 === 0)],
  },
};
