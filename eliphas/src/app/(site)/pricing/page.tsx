import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ServiceCard } from "@/components/ServiceCard";
import type { CatalogItem } from "@/lib/services";
import { PrintCalculator } from "@/components/PrintCalculator";
import { calculatorPlans } from "@/lib/calculator-plans";
import { estimateCopy, formatPaise, minimumPriceRupees, ruleFromPlanVersion, withGst } from "@/lib/commission";
import { getCurrentPlans } from "@/lib/plans";
import { gatewayPercent, printCost, rupees, sortedOptions, type PrintOptions } from "@/lib/pricing";
import { getPricingSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free to publish. A clear commission per copy sold, optional Author Pro, and optional one-time services.",
};

const BASE: Omit<PrintOptions, "page_count"> = { trim_size: "5x8", binding: "paperback", interior: "bw", paper: "cream", cover_finish: "matte" };
const TABLE_ROWS: { label: string; opts: Partial<PrintOptions> }[] = [
  { label: "Paperback · 5 × 8 in · B&W", opts: {} },
  { label: "Paperback · 6 × 9 in · B&W", opts: { trim_size: "6x9" } },
  { label: "Hardcover · 6 × 9 in · B&W", opts: { trim_size: "6x9", binding: "hardcover" } },
  { label: "Paperback · A5 · Colour", opts: { trim_size: "a5", interior: "color", paper: "white" } },
];
const PAGE_COUNTS = [100, 200, 300];

export default async function PricingPage() {
  const [{ rates, fees }, plans, calcPlans] = await Promise.all([getPricingSettings(), getCurrentPlans(), calculatorPlans()]);
  const gw = gatewayPercent(fees);
  const free = ruleFromPlanVersion(plans.free);
  const pro = ruleFromPlanVersion(plans.pro);
  const proPrice = withGst(plans.pro.price_paise, Number(plans.pro.gst_percent));
  const supabase = await createClient();
  const { data: services } = await supabase.from("current_service_catalog").select("*").eq("active", true).order("sort");

  const exampleCost = printCost({ ...BASE, page_count: 200 }, rates);
  const exFree = exampleCost === null ? null : estimateCopy(29900, exampleCost * 100, free, gw);
  const exPro = exampleCost === null ? null : estimateCopy(29900, exampleCost * 100, pro, gw);

  return (
    <div className="container-x py-10 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mono inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs tracking-[0.06em] text-muted uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-marigold" aria-hidden /> Pricing for authors
        </p>
        <h1 className="display mt-4 text-[2.25rem] leading-tight md:text-5xl">Free to publish. You set the price.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          No setup fee and no stock to buy. When a copy sells we deduct printing, our commission (+ GST) and payment charges; the rest is your earning.
          Pro and services are optional and never needed to publish.
        </p>
      </div>
      {rates.is_sample && (
        <p role="note" className="notice-warn mx-auto mt-8 max-w-3xl justify-center text-center">
          <strong>Sample print rates.</strong> Print costs are indicative until printer rates are final. Your dashboard always uses the current rate.
        </p>
      )}

      {/* ---------- Plans ---------- */}
      <section className="mt-12 grid gap-4 md:grid-cols-2" aria-label="Plans">
        <div className="flex flex-col rounded-[var(--radius-card)] bg-surface p-6 ring-1 ring-line md:p-7">
          <p className="mono text-xs tracking-[0.06em] text-muted uppercase">Default</p>
          <h2 className="display mt-1 text-2xl">Free Author</h2>
          <p className="mono mt-4 text-4xl font-medium">₹0</p>
          <p className="text-sm text-muted">No subscription</p>
          <ul className="mt-5 mb-auto space-y-2 text-sm">
            <Li ok>Publishing and bookstore listing</Li>
            <Li ok>Sales, earnings and payout dashboard</Li>
            <Li ok>Standard support</Li>
            <Li ok>
              Commission: {free.percent}% of the book price per copy, minimum {formatPaise(free.minPaise)}, plus {free.gstPercent}% GST on the commission
            </Li>
          </ul>
          <Link href="/login/author?mode=signup" className="btn-primary mt-6 w-full">
            Start publishing free
          </Link>
        </div>
        <div className="flex flex-col rounded-[var(--radius-card)] bg-surface p-6 ring-2 ring-marigold/40 md:p-7">
          <p>
            <span className="badge-pro">Optional</span>
          </p>
          <h2 className="display mt-1 text-2xl">Author Pro</h2>
          <p className="mono mt-4 text-4xl font-medium">
            {formatPaise(proPrice.totalPaise)}
            <span className="ml-1 font-sans text-base font-normal text-muted">/ month</span>
          </p>
          <p className="text-sm text-muted">
            {formatPaise(plans.pro.price_paise)} + {Number(plans.pro.gst_percent)}% GST. Prepaid monthly; renew when you want.
          </p>
          <ul className="mt-5 mb-auto space-y-2 text-sm">
            <Li ok>Everything in Free</Li>
            <Li ok>
              Lower commission: {pro.percent}% per copy, minimum {formatPaise(pro.minPaise)}, plus {pro.gstPercent}% GST
            </Li>
            <Li ok>Detailed sales analytics and campaign-link tracking</Li>
            <Li ok>{plans.pro.credits_per_period} template-based promotional creatives per paid month (one revision each)</Li>
            <Li ok>Priority support</Li>
            <Li>Unused creative credits don&apos;t roll over</Li>
            <Li>Not included: cover design, manuscript editing, book formatting, advertising spend, guaranteed sales</Li>
          </ul>
          <Link href="/login/author?next=/author/plan" className="btn-accent mt-6 w-full">
            Get Pro
          </Link>
        </div>
      </section>

      {exFree && exPro && (
        <section className="mt-12 rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line md:p-7" aria-labelledby="example-heading">
          <h2 id="example-heading" className="text-xl">
            Example: a 200-page paperback at ₹299
          </h2>
          <p className="mt-1 text-sm text-muted">Print cost {formatPaise(exFree.printCostPaise)}. Payment charges estimated at {gw}% of the book price.</p>
          <div className="ledger-wrap mt-4">
            <table className="ledger min-w-[420px]">
              <thead>
                <tr>
                  <th>Per copy</th>
                  <th className="num">Free</th>
                  <th className="num">Pro</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Book price", exFree.pricePaise, exPro.pricePaise],
                    ["Printing", exFree.printCostPaise, exPro.printCostPaise],
                    ["Commission", exFree.commissionPaise, exPro.commissionPaise],
                    ["GST on commission", exFree.commissionGstPaise, exPro.commissionGstPaise],
                    ["Payment charges", exFree.gatewayPaise, exPro.gatewayPaise],
                  ] as const
                ).map(([k, a, b]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num">{k === "Book price" ? "" : "− "}{formatPaise(a, true)}</td>
                    <td className="num">{k === "Book price" ? "" : "− "}{formatPaise(b, true)}</td>
                  </tr>
                ))}
                <tr className="bg-tint-success font-semibold">
                  <td>You earn per copy</td>
                  <td className="num text-success">{formatPaise(exFree.authorEarningPaise, true)}</td>
                  <td className="num text-success">{formatPaise(exPro.authorEarningPaise, true)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            The Pro subscription ({formatPaise(proPrice.totalPaise)} a month) is separate and not included above. Whether Pro pays for itself depends on how many
            copies you sell; we don&apos;t promise any sales or savings.
          </p>
        </section>
      )}

      <section className="mt-16" id="calculator" aria-labelledby="calc-heading">
        <p className="eyebrow">Calculator</p>
        <h2 id="calc-heading" className="display mt-3 text-2xl md:text-3xl">
          Your earnings per copy
        </h2>
        <p className="mt-2 text-muted">Uses the current print rates. Every deduction is shown.</p>
        <div className="mt-6">
          <PrintCalculator rates={rates} gatewayPercent={gw} plans={calcPlans} initial={{ ...BASE, page_count: 200, mrp: 299 }} />
        </div>
      </section>

      {/* ---------- One-time services ---------- */}
      {services && services.length > 0 && (
        <section className="mt-16" aria-labelledby="services-heading">
          <p className="eyebrow">Optional</p>
          <h2 id="services-heading" className="display mt-3 text-2xl md:text-3xl">
            One-time author services
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            For Free and Pro authors alike; no subscription needed. Prices exclude GST. We review your files and confirm a fixed quote with deliverables,
            revisions and a delivery date before you pay. No surprise charges.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {services.map((c) => (
              <ServiceCard
                key={c.id}
                item={c as CatalogItem}
                actions={
                  <Link href="/login/author?next=/author/services" className="btn-primary">
                    Request this service
                  </Link>
                }
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Pro creative credits and paid services are separate: a Launch Kit doesn&apos;t use your Pro credits, and cancelling Pro doesn&apos;t cancel a paid service.
          </p>
        </section>
      )}

      <section className="mt-16">
        <p className="eyebrow">Print costs</p>
        <h2 className="display mt-3 text-2xl md:text-3xl">Print cost per copy</h2>
        <p className="mt-2 text-muted">Matte cover. The lowest price is where a Free author&apos;s earning is just above zero.</p>
        <div className="ledger-wrap mt-6">
          <table className="ledger min-w-[560px]">
            <caption className="sr-only">Print cost per copy by format and page count</caption>
            <thead>
              <tr>
                <th scope="col">
                  Format
                </th>
                {PAGE_COUNTS.map((p) => (
                  <th key={p} scope="col" className="num">
                    {p} pages
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="!text-sm !font-medium !tracking-normal !text-fg !normal-case">
                    {row.label}
                  </th>
                  {PAGE_COUNTS.map((p) => {
                    const c = printCost({ ...BASE, ...row.opts, page_count: p }, rates);
                    return (
                      <td key={p} className="num">
                        {c === null ? (
                          "—"
                        ) : (
                          <>
                            <span className="font-medium">{rupees(c, true)}</span>
                            <span className="block text-xs text-muted">lowest price {rupees(minimumPriceRupees(c * 100, free, gw), true)}</span>
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
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {sortedOptions(rates.binding).map(([k, b]) => (
            <div key={k} className="flex justify-between gap-4 rounded-[var(--radius-control)] bg-surface px-3 py-2 ring-1 ring-line">
              <dt className="text-muted">{b.label} binding and cover</dt>
              <dd className="mono">{rupees(b.base)}</dd>
            </div>
          ))}
          {sortedOptions(rates.interior).map(([k, i]) => (
            <div key={k} className="flex justify-between gap-4 rounded-[var(--radius-control)] bg-surface px-3 py-2 ring-1 ring-line">
              <dt className="text-muted">{i.label} page</dt>
              <dd className="mono">{rupees(i.per_page)} / page</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16 rounded-[var(--radius-card)] bg-surface-2 p-6 md:p-8">
        <h2 className="display text-2xl">For readers</h2>
        <p className="mt-3 text-muted">
          Readers pay the price the author sets plus shipping, which depends on the delivery PIN code and parcel weight. The exact shipping charge and total
          are shown at checkout before payment. Commission never applies to shipping.
        </p>
      </section>
    </div>
  );
}

function Li({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />}
      <span className={ok ? "" : "text-muted"}>{children}</span>
    </li>
  );
}
