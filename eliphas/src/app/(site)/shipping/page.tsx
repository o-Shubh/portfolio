import type { Metadata } from "next";
import Link from "next/link";
import { Detail, LegalPage } from "@/components/LegalPage";
import { getBusiness } from "@/lib/settings";

export const metadata: Metadata = { title: "Shipping and delivery", description: "Where we deliver, how long it takes and what it costs." };

export default async function ShippingPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Shipping and delivery" updated="15 October 2026" path="/shipping">
      <h2>Where we deliver</h2>
      <p>
        We currently deliver to addresses in India. International delivery is coming soon.
      </p>

      <h2>How long it takes</h2>
      <ul>
        <li>
          <strong>Printing:</strong> 2 to 4 working days after your payment. Each copy is printed for you.
        </li>
        <li>
          <strong>Delivery:</strong> usually 3 to 5 working days after it ships, depending on your city.
        </li>
        <li>
          Most orders arrive within <strong>5 to 9 working days</strong>. Remote areas can take longer.
        </li>
      </ul>

      <h2>What it costs</h2>
      <p>
        Shipping depends on your PIN code and the weight of the parcel (pages, size and number of copies). The exact amount is shown at checkout before
        you pay, and never changes after you order. From time to time we may run shipping offers; they are shown at checkout and paid by us.
      </p>

      <h2>Tracking your order</h2>
      <p>
        Open <Link href="/account">My orders</Link> to see each step: confirmed, printing, printed, shipped and delivered.
        Once it ships you&apos;ll see the courier and tracking number.
      </p>

      <h2>Delivery problems</h2>
      <ul>
        <li>Check your address and phone number at checkout. The courier may call you before delivering.</li>
        <li>If a parcel is returned because of a wrong address or no one accepted it, we can send it again for the shipping cost.</li>
        <li>
          Damaged or missing parcels are covered by our <Link href="/refunds">refunds policy</Link>.
        </li>
      </ul>

      <p>
        Need help? <Detail value={b.email} label="Email" /> or <Detail value={b.phone} label="Phone" />.
      </p>
    </LegalPage>
  );
}
