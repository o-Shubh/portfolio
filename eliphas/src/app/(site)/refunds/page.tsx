import type { Metadata } from "next";
import Link from "next/link";
import { Detail, LegalPage } from "@/components/LegalPage";
import { getBusiness } from "@/lib/settings";

export const metadata: Metadata = { title: "Refunds and cancellations", description: "How to cancel an order and when you get a refund." };

export default async function RefundsPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Refunds and cancellations" updated="15 October 2026" path="/refunds">
      <p>
        Every book on Eliphas is printed especially for you after you order. That is why the rules below depend on whether
        printing has started.
      </p>

      <h2>Cancelling an order</h2>
      <ul>
        <li>
          <strong>Before printing starts</strong> (the order shows &ldquo;Paid&rdquo;): cancel it yourself from{" "}
          <Link href="/account">My orders</Link>. You get a full refund, including shipping.
        </li>
        <li>
          <strong>After printing starts</strong>: the copy is being made for you, so the order can&apos;t be cancelled. If there
          is a problem with it when it arrives, see below.
        </li>
      </ul>

      <h2>Damaged, misprinted or wrong books</h2>
      <p>
        If your book arrives damaged, with printing faults (missing or blank pages, wrong binding) or isn&apos;t the book you
        ordered, tell us within <strong>7 days of delivery</strong>. Email{" "}
        <Detail value={b.email} label="Email" /> with your order number and a photo of the problem. We will reprint and send
        it again at no cost, or give you a full refund if you prefer.
      </p>

      <h2>Orders that don&apos;t arrive</h2>
      <p>
        If your order hasn&apos;t arrived 15 days after it was shipped, contact us. We will trace it with the courier and send a
        new copy or refund you in full.
      </p>

      <h2>What we can&apos;t refund</h2>
      <ul>
        <li>Change of mind after printing has started, since the copy was made to order.</li>
        <li>Orders returned to us because the delivery address or phone number was wrong or no one accepted delivery. We can
          send it again if you pay the shipping again.</li>
      </ul>

      <h2>How refunds are paid</h2>
      <p>
        Refunds go back to the original payment method (card, UPI, net banking or wallet) through Razorpay. We start the refund
        within 2 working days of approving it; your bank usually shows it within <strong>5 to 7 working days</strong>. You can
        see the refund status on the order page.
      </p>

      <h2>Author Pro</h2>
      <p>
        Pro is prepaid for one month and doesn&apos;t renew automatically, so there is nothing to cancel. If you paid for a month that hasn&apos;t started, we
        refund it in full on request. For a month already running, contact us; refunds for unused time are at our discretion and end Pro access with
        unused credits removed. Requests you already submitted are still completed.
      </p>

      <h2>Author services</h2>
      <ul>
        <li>Before you pay: cancel at no cost.</li>
        <li>After you pay, before work starts: cancel from the request page for a full refund.</li>
        <li>After work starts: contact us; we refund for work not yet done.</li>
        <li>Cancelling Pro never cancels a paid service, and the other way round.</li>
      </ul>

      <h2>For authors</h2>
      <p>
        If an order is cancelled or refunded, the earning for that copy is removed from your balance. Copies you order of
        your own book follow the same rules.
      </p>

      <p>
        Questions: <Detail value={b.email} label="Email" /> or <Detail value={b.phone} label="Phone" />.
      </p>
    </LegalPage>
  );
}
