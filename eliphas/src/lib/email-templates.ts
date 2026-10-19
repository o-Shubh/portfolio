// Order update, contact and weekly emails: subject, HTML and plain text. Pure, so they can be unit-tested.
import { escapeHtml } from "./email-format.ts";

export type OrderEmailKind = "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled" | "refund_processed";

export type OrderEmailData = {
  siteUrl: string; // e.g. https://eliphas.in
  businessName: string;
  orderId: string;
  orderNumber: string;
  name: string;
  items: { title: string; quantity: number }[];
  totalLabel: string; // "₹459"
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  refundLabel?: string | null; // "₹459"
  cancelReason?: string | null;
};

const COPY: Record<OrderEmailKind, { subject: (n: string) => string; heading: string; body: (d: OrderEmailData) => string }> = {
  order_confirmed: {
    subject: (n) => `Order ${n} confirmed`,
    heading: "Thank you. Your order is confirmed.",
    body: () => "We're printing your copy fresh and will send it to you. We'll email you when it ships.",
  },
  order_shipped: {
    subject: (n) => `Order ${n} has shipped`,
    heading: "Your books are on the way.",
    body: (d) =>
      d.courier && d.trackingNumber ? `Sent with ${d.courier}. Tracking number: ${d.trackingNumber}.` : "Your parcel has been handed to the courier.",
  },
  order_delivered: {
    subject: (n) => `Order ${n} delivered`,
    heading: "Your order has been delivered.",
    body: () => "We hope you enjoy reading. If anything arrived damaged or wrong, report it from your order page within 7 days.",
  },
  order_cancelled: {
    subject: (n) => `Order ${n} cancelled`,
    heading: "Your order has been cancelled.",
    body: (d) =>
      `${d.cancelReason ? `Reason: ${d.cancelReason}. ` : ""}If you paid, the full amount is refunded to your original payment method. Banks usually show it within 5–7 working days.`,
  },
  refund_processed: {
    subject: (n) => `Refund for order ${n}`,
    heading: "Your refund has been sent.",
    body: (d) => `${d.refundLabel ?? "The amount"} has been refunded to your original payment method. Banks usually show it within 5–7 working days.`,
  },
};

const ORDER_FOOTER = "You're receiving this because you placed an order. You can turn off order emails in Settings.";
const shell = (
  business: string,
  inner: string,
  footer = escapeHtml(ORDER_FOOTER),
) => `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:13px;color:#6e6e73;padding-bottom:16px">${escapeHtml(business)}</td></tr>
${inner}
</table>
<p style="font-size:12px;color:#6e6e73;margin:16px 0 0">${footer}</p>
</td></tr></table></body></html>`;

/** Subject, HTML and text for one order update. */
export function orderEmail(kind: OrderEmailKind, d: OrderEmailData) {
  const c = COPY[kind];
  const orderUrl = `${d.siteUrl.replace(/\/$/, "")}/account/orders/${d.orderId}`;
  const itemsText = d.items.map((i) => `${i.title} × ${i.quantity}`).join("\n");
  const button = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:#17214a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(label)}</a>`;
  const track = kind === "order_shipped" && d.trackingUrl ? d.trackingUrl : null;
  const inner = `
<tr><td style="font-size:22px;font-weight:600;padding-bottom:8px">${escapeHtml(c.heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;padding-bottom:16px">Hi ${escapeHtml(d.name)}, ${escapeHtml(c.body(d))}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;background:#f5f5f7;border-radius:10px;padding:12px 14px">
<div style="color:#6e6e73;font-size:12px">Order ${escapeHtml(d.orderNumber)}</div>
${d.items.map((i) => `<div>${escapeHtml(i.title)} × ${i.quantity}</div>`).join("")}
<div style="margin-top:6px;font-weight:600">Total ${escapeHtml(d.totalLabel)}</div>
</td></tr>
<tr><td style="padding-top:20px">${track ? `${button(track, "Track parcel")}&nbsp;&nbsp;` : ""}${button(orderUrl, "View order")}</td></tr>`;
  const text = [
    c.heading,
    "",
    `Hi ${d.name}, ${c.body(d)}`,
    "",
    `Order ${d.orderNumber}`,
    itemsText,
    `Total ${d.totalLabel}`,
    "",
    ...(track ? [`Track parcel: ${track}`] : []),
    `View order: ${orderUrl}`,
    "",
    "You can turn off order emails in Settings.",
  ].join("\n");
  return { subject: c.subject(d.orderNumber), html: shell(d.businessName, inner), text };
}

/** A new message from the contact form, sent to the support address. */
export function contactEmail(d: { siteUrl: string; businessName: string; name: string; email: string; phone?: string | null; topic: string; message: string }) {
  const inbox = `${d.siteUrl.replace(/\/$/, "")}/admin/messages`;
  const inner = `
<tr><td style="font-size:20px;font-weight:600;padding-bottom:8px">New message: ${escapeHtml(d.topic)}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;padding-bottom:12px">From ${escapeHtml(d.name)} &lt;${escapeHtml(d.email)}&gt;${d.phone ? ` · ${escapeHtml(d.phone)}` : ""}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;white-space:pre-wrap;background:#f5f5f7;border-radius:10px;padding:12px 14px">${escapeHtml(d.message)}</td></tr>
<tr><td style="padding-top:16px;font-size:14px"><a href="${escapeHtml(inbox)}">Open the inbox</a></td></tr>`;
  return {
    subject: `Contact form: ${d.topic}`.slice(0, 200),
    html: shell(d.businessName, inner),
    text: `New message: ${d.topic}\nFrom ${d.name} <${d.email}>${d.phone ? ` · ${d.phone}` : ""}\n\n${d.message}\n\nInbox: ${inbox}`,
  };
}

export type DigestItem = { title: string; by?: string; note?: string; url: string };
export type DigestSections = { books: DigestItem[]; savedBooks: DigestItem[]; articles: DigestItem[]; posts: DigestItem[] };

/** The opt-in weekly email. Returns null when there's nothing to say, so nothing is sent that week. */
export function digestEmail(d: { siteUrl: string; businessName: string; name: string; unsubscribeUrl: string; sections: DigestSections }) {
  const groups: [string, DigestItem[]][] = [
    ["Books you saved", d.sections.savedBooks],
    ["New books from authors you follow", d.sections.books],
    ["New articles", d.sections.articles],
    ["From the community", d.sections.posts],
  ].filter(([, items]) => (items as DigestItem[]).length > 0) as [string, DigestItem[]][];
  if (!groups.length) return null;
  const count = groups.reduce((a, [, items]) => a + items.length, 0);
  const html = groups
    .map(
      ([heading, items]) => `
<tr><td style="font-size:13px;font-weight:600;color:#6e6e73;text-transform:uppercase;letter-spacing:.04em;padding:18px 0 6px">${escapeHtml(heading)}</td></tr>
${items
  .map(
    (i) => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.45"><a href="${escapeHtml(i.url)}" style="color:#17214a;font-weight:600;text-decoration:none">${escapeHtml(i.title)}</a>${
      i.by ? `<span style="color:#6e6e73"> · ${escapeHtml(i.by)}</span>` : ""
    }${i.note ? `<div style="color:#1f7a3d;font-size:13px">${escapeHtml(i.note)}</div>` : ""}</td></tr>`,
  )
  .join("")}`,
    )
    .join("");
  const inner = `
<tr><td style="font-size:22px;font-weight:600;padding-bottom:4px">Your week on ${escapeHtml(d.businessName)}</td></tr>
<tr><td style="font-size:15px;color:#6e6e73">Hi ${escapeHtml(d.name)}, here's what's new for you.</td></tr>
${html}`;
  const footer = `You asked for this weekly email. <a href="${escapeHtml(d.unsubscribeUrl)}" style="color:#6e6e73">Unsubscribe</a> with one click.`;
  const text = [
    `Your week on ${d.businessName}`,
    "",
    `Hi ${d.name}, here's what's new for you.`,
    ...groups.flatMap(([heading, items]) => ["", heading.toUpperCase(), ...items.map((i) => `- ${i.title}${i.by ? ` · ${i.by}` : ""}${i.note ? ` (${i.note})` : ""}: ${i.url}`)]),
    "",
    `Unsubscribe: ${d.unsubscribeUrl}`,
  ].join("\n");
  return { subject: `${count} new ${count === 1 ? "thing" : "things"} for you this week`, html: shell(d.businessName, inner, footer), text };
}
