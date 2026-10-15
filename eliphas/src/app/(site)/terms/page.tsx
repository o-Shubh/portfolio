import type { Metadata } from "next";
import Link from "next/link";
import { Detail, LegalPage } from "@/components/LegalPage";
import { rupees } from "@/lib/pricing";
import { getBusiness, getPricingSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms of use", description: "The rules for readers and authors using Eliphas Indicus Publications." };

export default async function TermsPage() {
  const [b, { fees }] = await Promise.all([getBusiness(), getPricingSettings()]);
  const name = <Detail value={b.legal_name} label="Business name" />;
  return (
    <LegalPage title="Terms of use" updated="15 October 2026" path="/terms">
      <p>
        These terms apply when you use the Eliphas Indicus Publications website or app (&ldquo;Eliphas&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;), run by {name}. By creating an account, ordering a book or publishing a book, you agree to them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You log in with your mobile number and a one-time code. Keep your phone secure: anyone with it can log in.</li>
        <li>You must be at least 18, or use Eliphas with a parent or guardian who agrees to these terms.</li>
        <li>Give accurate details. You are responsible for what happens under your account.</li>
        <li>
          You can delete your account at any time from your <Link href="/account/profile">profile</Link>. See our{" "}
          <Link href="/privacy">privacy policy</Link> for what we keep.
        </li>
      </ul>

      <h2>Buying books</h2>
      <ul>
        <li>Every book is printed on demand after you pay, by one of our partner presses.</li>
        <li>Prices are in Indian rupees and include applicable taxes. Shipping is shown before you pay.</li>
        <li>Payments are handled by Razorpay. We never see or store your card or bank details.</li>
        <li>
          An order is confirmed once payment succeeds. Cancellations and refunds follow our{" "}
          <Link href="/refunds">refunds and cancellations policy</Link>; delivery follows our{" "}
          <Link href="/shipping">shipping policy</Link>.
        </li>
        <li>Books are for personal use. You may not copy, scan or resell their contents.</li>
      </ul>

      <h2>Publishing your book</h2>
      <h3>Your rights</h3>
      <p>
        You keep the copyright and all other rights in your book. By publishing, you give us a non-exclusive, worldwide
        licence to store your files, print copies when readers order them, and show your cover, title, description and
        sample details in the bookstore and in promotion of your book. The licence ends when you unpublish the book, except
        for orders already placed.
      </p>
      <h3>What you promise</h3>
      <ul>
        <li>You own the book or have permission to publish everything in it, including the cover, images and quotes.</li>
        <li>
          The book does not break any law. It does not infringe anyone&apos;s rights, defame anyone, promote violence or hatred,
          contain sexual content involving minors, or reveal anyone&apos;s private information without consent.
        </li>
        <li>The details you enter (title, author name, ISBN, description) are accurate.</li>
      </ul>
      <p>
        If a claim is made against us because one of these promises was untrue, you agree to cover our reasonable costs of
        dealing with it.
      </p>
      <h3>Review and removal</h3>
      <p>
        We review every book before it goes live and may ask for changes or decline to publish it. We may remove a book if
        we receive a credible complaint or find it breaks these terms. We will tell you why.
      </p>
      <h3>Earnings and payouts</h3>
      <ul>
        <li>
          You set the price (MRP). For each copy sold you earn the MRP minus the print cost, a platform fee (currently{" "}
          {rupees(fees.platform_fee_per_copy)} per copy) and payment charges. You see the exact amount before you publish.
        </li>
        <li>The split is fixed when an order is paid. Later price or rate changes do not affect existing orders.</li>
        <li>Earnings on cancelled or refunded orders are reversed.</li>
        <li>We pay earnings to the UPI ID or bank account in your profile. Payout dates are shown in your dashboard.</li>
        <li>You are responsible for declaring your earnings and paying your own taxes.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Do not misuse Eliphas: no attempts to break or overload it, access other people&apos;s accounts or data, place fake
        orders, or upload malicious files. We may suspend accounts that do.
      </p>

      <h2>Liability</h2>
      <p>
        We work hard to keep Eliphas running and to print every book well, but we provide the service as it is. To the
        extent the law allows, we are not liable for indirect losses such as lost profits, and our total liability for any
        order is limited to the amount paid for that order. Nothing in these terms limits rights you have under consumer
        protection law.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms. If a change is significant we will show a notice on the website before it applies. These
        terms are governed by the laws of India, and courts in <Detail value={b.jurisdiction_city} label="City" /> have
        jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <Detail value={b.email} label="Email" />. Full details on our{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
