import type { Metadata } from "next";
import Link from "next/link";
import { Detail, LegalPage } from "@/components/LegalPage";
import { getBusiness } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy policy", description: "What personal data Eliphas Indicus Publications collects and how it is used." };

export default async function PrivacyPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Privacy policy" updated="15 October 2026" path="/privacy">
      <p>
        This policy explains what personal data {<Detail value={b.legal_name} label="Business name" />} collects when you use
        Eliphas, why, and the choices you have. We follow India&apos;s Digital Personal Data Protection Act, 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your mobile number, name, city, state or region and optional postal code.
        </li>
        <li>
          <strong>Orders:</strong> the delivery name, phone and address you enter, the books you buy and payment status. Razorpay
          processes the payment; we receive only a payment reference, never your card, UPI PIN or bank login.
        </li>
        <li>
          <strong>Authors:</strong> your book files and details, and the UPI ID or bank details you give for payouts.
        </li>
        <li>
          <strong>Technical:</strong> a login cookie to keep you signed in, and on your own device your theme choice and whether
          you dismissed the &ldquo;install app&rdquo; card. We do not use advertising or tracking cookies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To log you in with a one-time code sent by text message.</li>
        <li>To print, ship and track your orders, and to contact you about them.</li>
        <li>To review and publish books, calculate earnings and pay authors.</li>
        <li>To keep accounts and records required by tax and other laws, and to prevent fraud.</li>
      </ul>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>Printing partners and couriers</strong> receive the delivery name, phone, address and what to print, only for
          orders they fulfil.
        </li>
        <li>
          <strong>Service providers</strong> who run Eliphas for us: Supabase (database, login and file storage), Vercel (website
          hosting), Razorpay (payments) and our text-message provider (login codes).
        </li>
        <li>
          <strong>Authors</strong> see how many copies sold and in which city, never a buyer&apos;s name, phone or address.
        </li>
        <li>Authorities, when the law requires it.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep account data while your account is open. Order and payment records are kept for eight years because tax law
        requires it, even after you delete your account. Book files are kept while the book is live and deleted within 90
        days of you asking us to remove them.
      </p>

      <h2>Your rights and choices</h2>
      <ul>
        <li>
          See and correct your details in your <Link href="/account/profile">profile</Link>.
        </li>
        <li>
          Delete your account from your profile. Your login and profile are deleted straight away; past orders are kept for tax
          records but are no longer linked to you.
        </li>
        <li>Ask us for a copy of your data, or withdraw consent, by writing to the email below.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and stored with access rules that let each person see only their own records.
        Manuscripts are private and visible only to you and our review team.
      </p>

      <h2>Children</h2>
      <p>Eliphas is not meant for children under 18 without a parent or guardian.</p>

      <h2>Contact and complaints</h2>
      <p>
        Grievance officer: <strong><Detail value={b.grievance_officer} label="Name" /></strong>,{" "}
        <Detail value={b.email} label="Email" />. If you are not satisfied with our answer you may complain to the Data
        Protection Board of India. See also our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
