import { Download, QrCode } from "lucide-react";
import { editionUrl, QR_PRINT } from "@/lib/eeid-format";
import { qrOrigin, qrSvg } from "@/lib/edition-qr";
import { CopyButton } from "./CopyButton";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

/**
 * "Edition identity": the book's Eliphas Edition ID, its public link and QR downloads. Read-only; IDs are
 * assigned by the server on approval and can't be edited or regenerated here.
 */
export async function EditionIdentity({
  book,
  viewer,
}: {
  book: { eeid: string | null; eeid_assigned_at: string | null; status: string; published_at: string | null; removed_at: string | null };
  viewer: "author" | "admin";
}) {
  if (!book.eeid) {
    return (
      <section className="card" aria-labelledby="eeid-h" data-testid="edition-identity">
        <h2 id="eeid-h" className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5 text-accent-fg" aria-hidden /> Edition identity
        </h2>
        <p className="mt-2 text-sm text-muted" data-testid="eeid-pending">
          Your Eliphas Edition ID will be generated after publishing approval.
        </p>
      </section>
    );
  }

  const { origin, production, problem } = qrOrigin();
  const url = editionUrl(origin, book.eeid);
  const svg = await qrSvg(url);
  const state = book.removed_at ? "Removed by our team" : book.status === "published" ? "Live" : book.published_at ? "Not on sale right now" : "Approved, not yet published";
  const dl = (format: string, label: string) =>
    production ? (
      <a href={`/api/editions/${book.eeid}/qr?format=${format}`} className="btn-ghost min-h-11 gap-2 px-3 text-sm" download data-testid={`qr-${format}`}>
        <Download className="h-4 w-4" aria-hidden /> {label}
      </a>
    ) : (
      <button type="button" className="btn-ghost min-h-11 gap-2 px-3 text-sm" disabled aria-describedby="qr-preview-note">
        <Download className="h-4 w-4" aria-hidden /> {label}
      </button>
    );

  return (
    <section className="card" aria-labelledby="eeid-h" data-testid="edition-identity">
      <h2 id="eeid-h" className="flex items-center gap-2 text-lg">
        <QrCode className="h-5 w-5 text-accent-fg" aria-hidden /> Edition identity
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-[10rem_1fr]">
        <figure className="mx-auto w-40 sm:mx-0">
          <div className="relative rounded-[var(--radius-control)] bg-white p-1 ring-1 ring-line" data-testid="qr-preview">
            <div className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`QR code linking to ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
            {!production && (
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-white/90 py-1 text-center text-xs font-bold tracking-wide text-danger" aria-hidden>
                PREVIEW · NOT FOR PRINT
              </span>
            )}
          </div>
          <figcaption className="mt-1 text-center text-xs text-muted">Scan to explore this book</figcaption>
        </figure>
        <div className="min-w-0 space-y-3">
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="text-muted">Eliphas Edition ID</dt>
              <dd className="font-mono text-base font-semibold break-all" data-testid="eeid">{book.eeid}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>
                {state}
                {book.eeid_assigned_at && <span className="text-muted"> · assigned {when(book.eeid_assigned_at)}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Public page</dt>
              <dd className="break-all">
                <a href={`/e/${book.eeid}`} className="font-medium text-accent-fg underline-offset-2 hover:underline">
                  {url}
                </a>
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={book.eeid} label="Copy EEID" testId="copy-eeid" />
            <CopyButton text={url} label="Copy public link" testId="copy-link" />
          </div>
          <div className="flex flex-wrap gap-2">
            {dl("png", "QR as PNG")}
            {dl("svg", "QR as SVG")}
            {dl("pdf", "Print label (PDF)")}
          </div>
          {!production && (
            <p id="qr-preview-note" role="note" className="rounded-[var(--radius-control)] bg-surface-2 p-3 text-sm" data-testid="qr-preview-note">
              {viewer === "admin" ? (
                <>
                  Print downloads are off: {problem} Set <code>PUBLIC_SITE_ORIGIN</code> to your production address (for example
                  https://your-domain.in) in your hosting environment variables and redeploy. The preview above uses {origin}.
                </>
              ) : (
                <>The QR preview isn&apos;t final yet. Downloads open once our team finishes setting up the site address.</>
              )}
            </p>
          )}
          <p className="text-xs text-muted">
            Print the QR at about {QR_PRINT.recommendedMm} mm wide (at least {QR_PRINT.minimumMm} mm), including its white border; never
            crop the border. The PNG is {QR_PRINT.pngPixels} × {QR_PRINT.pngPixels} px; the SVG and label PDF are vector and stay sharp at any
            size. Keep it separate from the ISBN barcode.
          </p>
          <p className="text-xs text-muted">
            The EEID is Eliphas&apos;s own edition identifier. It isn&apos;t an ISBN or a copyright registration, and the QR doesn&apos;t prove a
            printed copy is genuine: every copy of this edition shares the same code.
          </p>
        </div>
      </div>
    </section>
  );
}
