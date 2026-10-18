/* eslint-disable @next/next/no-img-element -- static sample previews, already sized WebP files */
import { Clock, Download } from "lucide-react";
import { formatPaise, withGst } from "@/lib/commission";
import { DELIVERY_NOTE, SAMPLE_LABEL, SERVICE_PORTFOLIO } from "@/lib/service-portfolio";
import type { CatalogItem } from "@/lib/services";
import { SampleGallery } from "./SampleGallery";

/** Price line with the tax shown: fixed prices get the full total, quoted services the range. */
export function servicePrice(c: Pick<CatalogItem, "pricing" | "price_paise" | "min_paise" | "max_paise" | "gst_percent">) {
  const gst = Number(c.gst_percent);
  if (c.pricing === "fixed") {
    const t = withGst(c.price_paise!, gst);
    return { main: formatPaise(c.price_paise!), detail: `+ ${gst}% GST (${formatPaise(t.gstPaise)}) = ${formatPaise(t.totalPaise)}` };
  }
  return { main: `${formatPaise(c.min_paise!)}–${formatPaise(c.max_paise!)}`, detail: `+ ${gst}% GST · fixed quote after we review your files` };
}

/**
 * One author service: price with tax, samples, deliverables, revisions, exclusions and how delivery is set.
 * `actions` holds the buttons (start a request, view an existing one, upgrade).
 */
export function ServiceCard({ item, actions, headingLevel = 3 }: { item: CatalogItem; actions?: React.ReactNode; headingLevel?: 2 | 3 }) {
  const portfolio = SERVICE_PORTFOLIO[item.code];
  const price = servicePrice(item);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="card flex flex-col gap-5" aria-labelledby={`svc-${item.code}`}>
      <header>
        <H id={`svc-${item.code}`} className="text-xl">
          {item.name}
        </H>
        <p className="mt-1 text-2xl font-semibold mono">{price.main}</p>
        <p className="text-sm text-muted tabular-nums">{price.detail}</p>
        <p className="mt-2 text-sm text-muted">{item.scope}</p>
      </header>

      {portfolio && (
        <section aria-label="Sample work" className="space-y-2">
          <p className="text-sm">{portfolio.intro}</p>
          <SampleGallery title={item.name ?? "Sample work"} samples={portfolio.samples} previews={portfolio.beforeAfter ? 0 : 3} />
          <p className="text-xs text-muted">
            {SAMPLE_LABEL}
            {portfolio.note && ` ${portfolio.note}`}
          </p>
        </section>
      )}

      {portfolio?.beforeAfter && (
        <section aria-label="Before and after formatting" className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <figure className="min-w-0 space-y-1">
              <img src={portfolio.beforeAfter.before.thumb} alt={portfolio.beforeAfter.before.alt} loading="lazy" decoding="async" className="aspect-[2/3] w-full rounded-lg object-cover object-top ring-1 ring-line" />
              <figcaption className="text-xs font-semibold">Before</figcaption>
            </figure>
            <figure className="min-w-0 space-y-1">
              <img src={portfolio.beforeAfter.after[0].thumb} alt={portfolio.beforeAfter.after[0].alt} loading="lazy" decoding="async" className="aspect-[2/3] w-full rounded-lg object-cover object-top ring-1 ring-line" />
              <figcaption className="text-xs font-semibold">After</figcaption>
            </figure>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={portfolio.beforeAfter.beforePdf} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 font-semibold underline underline-offset-2">
              <Download className="h-4 w-4" aria-hidden /> Before sample (PDF)
            </a>
            <a href={portfolio.beforeAfter.afterPdf} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 font-semibold underline underline-offset-2">
              <Download className="h-4 w-4" aria-hidden /> After sample (PDF)
            </a>
          </p>
        </section>
      )}

      <section aria-label="What you receive">
        <h4 className="text-sm font-semibold">What you receive</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {(item.deliverables ?? []).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Revisions:</span>{" "}
          {item.revision_rounds === 1 ? "one consolidated revision round" : `${item.revision_rounds} revision rounds`}
          {item.code === "launch_kit" && " (covering all five designs)"}
        </p>
      </section>

      {(item.exclusions ?? []).length > 0 && (
        <section aria-label="Not included">
          <h4 className="text-sm font-semibold">Not included unless separately quoted</h4>
          <p className="mt-1 text-sm text-muted">{item.exclusions!.join(" · ")}</p>
        </section>
      )}

      <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          {DELIVERY_NOTE} You see the price, GST and total in your quote before you accept or pay.
        </span>
      </p>

      {actions && <div className="mt-auto flex flex-wrap items-center gap-3">{actions}</div>}
    </article>
  );
}
