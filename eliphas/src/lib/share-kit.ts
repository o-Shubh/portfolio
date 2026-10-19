// Author share kit: the link to share and ready-made captions. Pure functions (no imports), unit tested directly.

/** The book's link: through the author's invite link while the invite programme is on, so new customers count. */
export function bookShareLink(site: string, slug: string, inviteCode: string | null) {
  const base = site.replace(/\/$/, "");
  return inviteCode ? `${base}/r/${inviteCode}?b=${encodeURIComponent(slug)}` : `${base}/books/${encodeURIComponent(slug)}`;
}

const price = (mrp: number | null) => (mrp === null ? "" : `₹${mrp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

/** Three captions to copy: a short one, a launch announcement and one that offers the free sample. */
export function shareCaptions(b: { title: string; author: string; mrp: number | null; hasSample: boolean; inviteDiscount: number }, link: string) {
  const offer = b.inviteDiscount > 0 ? ` New readers get ₹${b.inviteDiscount} off their first order.` : "";
  const cost = b.mrp !== null ? ` (${price(b.mrp)})` : "";
  return [
    { label: "Short", text: `My book "${b.title}" is out now${cost}. Printed fresh and delivered across India.${offer} ${link}` },
    {
      label: "Announcement",
      text: `It's here! "${b.title}" by ${b.author} is now available as a paperback, printed fresh for every reader and delivered to your door.${offer}\n\nOrder your copy: ${link}`,
    },
    b.hasSample
      ? { label: "Free sample", text: `Read the first pages of "${b.title}" free, before you buy: ${link}` }
      : {
          label: "Ask for support",
          text: `Every copy of "${b.title}" helps an independent author. If you've enjoyed my writing, order a copy or share this link: ${link}`,
        },
  ];
}

/** WhatsApp share address for a message. */
export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
