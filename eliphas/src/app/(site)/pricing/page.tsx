import type { Metadata } from "next";
import Link from "next/link";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { PrintCalculator } from "@/components/PrintCalculator";
import { earnings, minimumMrp, printCost, rupees, sortedOptions, type PrintOptions } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free to publish. See print costs, the ₹15 platform fee and exactly what you earn per copy.",
};

const BASE: Omit<PrintOptions, "page_count"> = {
  trim_size: "5x8",
  binding: "paperback",
  interior: "bw",
  paper: "cream",
  cover_finish: "matte",
};

// Rows of the print-cost table. Each must use option keys that exist in settings.print_rates.
const TABLE_ROWS: { label: string; opts: Partial<PrintOptions> }[] = [
  { label: "Paperback · 5 × 8 in · B&W", opts: {} },
  { label: "Paperback · 6 × 9 in · B&W", opts: { trim_size: "6x9" } },
  { label: "Hardcover · 6 × 9 in · B&W", opts: { trim_size: "6x9", binding: "hardcover" } },
  { label: "Paperback · A5 · Colour", opts: { trim_size: "a5", interior: "color", paper: "white" } },
];
const PAGE_COUNTS = [100, 200, 300];

export default async function PricingPage() {
  const { rates, fees, shipping } = await getPricingSettings();
  const gatewayEffective = (fees.gateway_percent * (1 + fees.gateway_gst_percent / 100)).toFixed(2);

  const exampleCost = printCost({ ...BASE, page_count: 200 }, rates);
  const example = exampleCost === null ? null : earnings(299, exampleCost, fees);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <span className="eyebrow">Pricing</span>
      <h1 className="mt-3 text-4xl font-semibold md:text-6xl">Free to publish. You set the price.</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        No setup fee, no stock to buy, no yearly charges. When a copy sells, three things come out of the MRP and the
        rest is your earning.
      </p>

      {rates.is_sample && (
        <p role="note" className="mt-6 rounded-2xl bg-marigold/10 ring-1 ring-marigold/30 px-4 py-3 text-sm">
          <strong>Sample rates.</strong> Print costs below are indicative and will be updated once printer rates are
          final. Your dashboard always shows the current rate.
        </p>
      )}

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <FeeCard title="Printing" value="Per copy" text="Depends on pages, size, binding and colour. See the table below." />
        <FeeCard
          title="Platform fee"
          value={rupees(fees.platform_fee_per_copy)}
          text="Flat, per copy sold. Covers review, the bookstore, order handling and support."
        />
        <FeeCard
          title="Payment charges"
          value={`${gatewayEffective}%`}
          text={`Of the MRP. Razorpay's ${fees.gateway_percent}% charge plus ${fees.gateway_gst_percent}% GST on it.`}
        />
      </section>

      {example && (
        <section className="mt-12 grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-semibold">A worked example</h2>
            <p className="mt-2 text-muted">
              A 200-page paperback novel, 5 × 8 inches, black & white, priced at {rupees(299)}.
            </p>
            <p className="mt-4 text-muted">
              <strong className="text-fg">Earning per copy</strong> = MRP − printing − platform fee − payment charges.
              You see this calculation live when you set your price.
            </p>
          </div>
          <div className="card">
            <EarningsBreakdown e={example} />
          </div>
        </section>
      )}

      <section className="mt-14" aria-labelledby="calc-heading">
        <h2 id="calc-heading" className="text-2xl font-semibold">
          Earnings calculator
        </h2>
        <p className="mt-1 text-muted">Try your own book. Change any option and see your earning per copy.</p>
        <div className="mt-5">
          <PrintCalculator rates={rates} fees={fees} initial={{ ...BASE, page_count: 200, mrp: 299 }} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Print cost per copy</h2>
        <p className="mt-1 text-muted">Matte cover. The lowest MRP is where your earning is just above zero.</p>
        <div className="mt-5 overflow-x-auto rounded-3xl bg-surface shadow-soft ring-1 ring-line">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Print cost per copy by format and page count</caption>
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="p-4 font-medium">
                  Format
                </th>
                {PAGE_COUNTS.map((p) => (
                  <th key={p} scope="col" className="p-4 text-right font-medium">
                    {p} pages
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {TABLE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="p-4 font-medium">
                    {row.label}
                  </th>
                  {PAGE_COUNTS.map((p) => {
                    const c = printCost({ ...BASE, ...row.opts, page_count: p }, rates);
                    return (
                      <td key={p} className="p-4 text-right tabular-nums">
                        {c === null ? (
                          "—"
                        ) : (
                          <>
                            <span className="font-semibold">{rupees(c)}</span>
                            <span className="block text-xs text-muted">lowest MRP {rupees(minimumMrp(c, fees, 1))}</span>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-semibold">Rate card</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {sortedOptions(rates.binding).map(([k, b]) => (
              <RateRow key={k} label={`${b.label} binding and cover`} value={rupees(b.base)} />
            ))}
            {sortedOptions(rates.interior).map(([k, i]) => (
              <RateRow key={k} label={`${i.label} page`} value={`${rupees(i.per_page)} / page`} />
            ))}
            {sortedOptions(rates.paper)
              .filter(([, p]) => p.per_page_extra > 0)
              .map(([k, p]) => (
                <RateRow key={k} label={p.label} value={`+ ${rupees(p.per_page_extra)} / page`} />
              ))}
          </dl>
          <p className="mt-3 text-xs text-muted">
            Bigger page sizes cost more per page:{" "}
            {sortedOptions(rates.trim_sizes)
              .map(([, t]) => `${t.label.split(" (")[0]} ×${t.page_multiplier}`)
              .join(", ")}
            .
          </p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold">For readers</h2>
          <p className="mt-3 text-muted">
            Readers pay the MRP you set, plus shipping of {rupees(shipping.flat)} per order. Shipping is free when the
            order is {rupees(shipping.free_above)} or more.
          </p>
          <Link href="/login?next=/author" className="btn-accent mt-6">
            Start publishing
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeeCard({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <div className="card">
      <h2 className="font-sans text-xs font-bold tracking-[0.14em] text-muted uppercase">{title}</h2>
      <p className="mt-2 font-heading text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-muted">{text}</p>
    </div>
  );
}

function RateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
