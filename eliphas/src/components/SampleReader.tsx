"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/**
 * Reads a sample PDF page by page in the browser (pdf.js). Fits the page to the screen width; zoom
 * scrolls within the page area. Works without an account. The PDF itself is a public file.
 */
export function SampleReader({
  url,
  title,
  backHref,
  buyHref,
  price,
  note,
  embedded = false,
}: {
  url: string;
  title: string;
  backHref?: string;
  buyHref?: string;
  price?: string;
  note: string;
  /** Shown inside a page (the author's preview) rather than full screen */
  embedded?: boolean;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(0); // last page drawn, for the loading message
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const task = useRef<RenderTask | null>(null);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loaded = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
        if (cancelled) loaded.destroy();
        else setDoc(loaded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url]);

  const render = useCallback(async () => {
    if (!doc || !canvas.current || !area.current) return;
    try {
      task.current?.cancel();
      const p = await doc.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const width = Math.max(240, area.current.clientWidth - 32);
      const scale = Math.min(width / base.width, 2.2); // fit the page to the screen width
      const viewport = p.getViewport({ scale: scale * zoom });
      const ratio = window.devicePixelRatio || 1;
      const c = canvas.current;
      c.width = Math.floor(viewport.width * ratio);
      c.height = Math.floor(viewport.height * ratio);
      c.style.width = `${Math.floor(viewport.width)}px`;
      c.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      task.current = p.render({ canvasContext: ctx, viewport });
      await task.current.promise;
      setShown(page);
    } catch (e) {
      if ((e as { name?: string })?.name !== "RenderingCancelledException") setFailed(true);
    }
  }, [doc, page, zoom]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => render());
    const onResize = () => render();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [render]);

  const pages = doc?.numPages ?? 0;
  const go = useCallback((n: number) => {
    if (!pages) return;
    setPage(Math.min(pages, Math.max(1, n)));
    area.current?.scrollTo({ top: 0, left: 0 });
  }, [pages]);
  const zoomBy = (d: number) => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + d))]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(page + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page]);

  const btn = "grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-transparent pointer-fine:h-9 pointer-fine:w-9";
  // Floating page arrows for mouse users; keyboard and screen-reader users have the labelled bar and arrow keys
  const side = "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface text-fg shadow-lift ring-1 ring-line hover:bg-surface-2 disabled:opacity-0 md:grid";
  const atEnd = pages > 0 && page >= pages;

  return (
    <div className={`flex flex-col bg-surface-2 ${embedded ? "h-[75vh] overflow-hidden rounded-[var(--radius-card)] border border-line" : "h-dvh"}`} data-testid="sample-reader">
      <header className={`${embedded ? "" : "safe-top"} glass flex items-center gap-2 border-b border-line px-2 py-1.5 sm:px-4`}>
        {backHref && (
          <Link href={backHref} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full pr-3 pl-2 text-sm hover:bg-surface-2 pointer-fine:min-h-9" aria-label="Close sample and go back to the book">
            <ChevronLeft className="h-5 w-5" aria-hidden />
            <span className="max-sm:hidden">Book details</span>
                      </Link>
        )}
        <div className="min-w-0 flex-1 sm:text-center">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-[0.7rem] text-muted">
            <span className="mono mr-1.5 inline-flex items-center gap-1 tracking-[0.06em] text-marigold-fg uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-marigold" aria-hidden /> Free sample
            </span>
            {note}
          </p>
        </div>
        {buyHref && (
          <Link href={buyHref} className="btn-accent min-h-11 shrink-0 px-4 text-sm pointer-fine:min-h-9" data-testid="sample-buy">
            {price ? `Buy · ${price}` : "Buy the book"}
          </Link>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        <button type="button" className={`${side} left-4`} onClick={() => go(page - 1)} disabled={page <= 1} aria-hidden tabIndex={-1}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" className={`${side} right-4`} onClick={() => go(page + 1)} disabled={!pages || page >= pages} aria-hidden tabIndex={-1}>
          <ChevronRight className="h-5 w-5" />
        </button>
        <div
          ref={area}
          className="h-full overflow-auto"
          onTouchStart={(e) => {
            touch.current = zoom === 1 && e.touches.length === 1 ? e.touches[0].clientX : null;
          }}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 60) go(page + (dx < 0 ? 1 : -1));
            touch.current = null;
          }}
        >
          {failed ? (
            <div className="mx-auto mt-10 max-w-md rounded-[var(--radius-card)] bg-surface p-6 text-center ring-1 ring-line">
              <p className="font-semibold">We couldn&apos;t show the sample here.</p>
              <p className="mt-1 text-sm text-muted">Check your connection and try again, or open it as a PDF.</p>
              <a href={url} target="_blank" rel="noopener" className="btn-ghost mt-4 inline-flex">
                Open the sample PDF
              </a>
            </div>
          ) : (
            <div className="flex min-h-full min-w-max flex-col items-center p-4 md:px-20 md:py-8">
              <canvas ref={canvas} className="rounded-[4px] bg-white shadow-sheet" role="img" aria-label={pages ? `Sample page ${page} of ${pages}` : "Loading sample"} />
              {(!doc || shown !== page) && (
                <p role="status" className="absolute inset-x-0 top-6 text-center text-sm text-muted">
                  Loading page…
                </p>
              )}
              {atEnd && buyHref && !embedded && (
                <section className="mt-6 w-full max-w-[min(100%,46rem)] rounded-[18px] bg-primary p-5 text-on-primary sm:p-7" data-testid="sample-end">
                  <p className="mono text-[0.7rem] tracking-[0.06em] text-on-primary/70 uppercase">End of the free sample</p>
                  <h2 className="display mt-1.5 text-2xl text-on-primary">Enjoying {title}?</h2>
                  <p className="mt-1.5 text-sm text-on-primary/80">Order the full book. It&apos;s printed fresh for you and delivered across India.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={buyHref} className="btn-accent min-h-11">
                      {price ? `Buy the book · ${price}` : "Buy the book"}
                    </Link>
                    {backHref && (
                      <Link href={backHref} className="btn min-h-11 bg-white/10 text-on-primary hover:bg-white/15">
                        Back to book details
                      </Link>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Sample pages" className={`${embedded ? "" : "safe-bottom"} glass flex items-center justify-center gap-1 border-t border-line px-2 py-1.5 sm:gap-3`}>
        <button type="button" className={btn} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="mono min-w-24 text-center text-sm" aria-live="polite" data-testid="sample-page">
          {pages ? `Page ${page} of ${pages}` : "…"}
        </p>
        <button type="button" className={btn} onClick={() => go(page + 1)} disabled={!pages || page >= pages} aria-label="Next page">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        {pages > 2 && (
          <input
            type="range"
            min={1}
            max={pages}
            value={page}
            onChange={(e) => go(Number(e.target.value))}
            aria-label="Go to page"
            className="mx-2 hidden w-40 accent-[var(--color-primary)] md:block lg:w-64"
          />
        )}
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        <button type="button" className={btn} onClick={() => zoomBy(-1)} disabled={zoom <= ZOOMS[0]} aria-label="Zoom out">
          <Minus className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" className="mono min-h-11 min-w-14 rounded-full px-2 text-sm hover:bg-surface-2 pointer-fine:min-h-9" onClick={() => setZoom(1)} aria-label="Reset zoom" data-testid="sample-zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className={btn} onClick={() => zoomBy(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} aria-label="Zoom in">
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      </nav>
    </div>
  );
}
