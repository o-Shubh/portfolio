import type { Metadata } from "next";
import Link from "next/link";
import { Detail, LegalPage } from "@/components/LegalPage";
import { ContactForm } from "@/components/ContactForm";
import { getCurrentProfile } from "@/lib/auth";
import { getBusiness } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact us",
  description: "How to reach Eliphas Indicus Publications about orders, publishing and payouts.",
};

export default async function ContactPage() {
  const [b, me] = await Promise.all([getBusiness(), getCurrentProfile()]);
  return (
    <LegalPage title="Contact us" updated="15 October 2026" path="/contact">
      <p>
        Questions about an order, your book or a payout? Send us a message below and include your order number or book title. We reply within two working days.
      </p>

      <div className="mt-8">
        <ContactForm name={me?.full_name ?? undefined} email={me?.email ?? undefined} />
      </div>

      <h2>Other ways to reach us</h2>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        {[
          { term: "Email", value: <Detail value={b.email} label="Email" /> },
          { term: "Phone", value: <Detail value={b.phone} label="Phone" /> },
          { term: "Hours", value: <Detail value={b.support_hours} label="Support hours" /> },
          { term: "Business", value: <Detail value={b.legal_name} label="Business name" /> },
          {
            term: "Address",
            value: (
              <span className="whitespace-pre-line">
                <Detail value={b.address} label="Address" />
              </span>
            ),
          },
          ...(b.gstin ? [{ term: "GSTIN", value: <>{b.gstin}</> }] : []),
        ].map((r) => (
          <div key={r.term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">{r.term}</dt>
            <dd className="font-medium text-fg select-all">{r.value}</dd>
          </div>
        ))}
      </dl>

      <h2>Grievance officer</h2>
      <p>
        If you have a complaint about content on this website or about how we handle your personal data, contact our grievance officer,{" "}
        <strong>
          <Detail value={b.grievance_officer} label="Name" />
        </strong>
        , at the email above. We acknowledge complaints within 24 hours and resolve them within 15 days.
      </p>

      <h2>Before you write</h2>
      <ul>
        <li>
          To track an order, open <Link href="/account">My orders</Link>.
        </li>
        <li>
          To cancel an order that hasn&apos;t started printing, open it in My orders and choose Cancel order. See{" "}
          <Link href="/refunds">Refunds and cancellations</Link>.
        </li>
        <li>
          For publishing questions, see <Link href="/faq">Help and FAQ</Link>.
        </li>
      </ul>
    </LegalPage>
  );
}
