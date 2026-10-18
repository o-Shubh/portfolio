"use client";

/* eslint-disable @next/next/no-img-element -- static sample previews, already sized WebP files */
import { ChevronLeft, ChevronRight, Images, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_LABEL, type SampleImage } from "@/lib/service-portfolio";

/**
 * Preview strip plus a "View sample work" button that opens a full-screen gallery:
 * previous / next, zoom, close, arrow keys and Escape, a label for every image.
 */
export function SampleGallery({ title, samples, previews = 3, compact = false }: { title: string; samples: SampleImage[]; previews?: number; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const count = samples.length;

  const open = (i: number) => {
    setIndex(i);
    setZoomed(false);
    dialog.current?.showModal();
    document.documentElement.classList.add("overflow-hidden");
  };
  const close = () => dialog.current?.close();
  const go = useCallback(
    (step: number) => {
      setZoomed(false);
      setIndex((i) => (i + step + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => document.documentElement.classList.remove("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setZoomed(true);
      else if (e.key === "-") setZoomed(false);
    };
    d.addEventListener("close", onClose);
    d.addEventListener("keydown", onKey);
    return () => {
      d.removeEventListener("close", onClose);
      d.removeEventListener("keydown", onKey);
    };
  }, [go]);

  if (!count) return null;
  const s = samples[index];

  return (
    <div className={compact ? "contents" : "space-y-3"}>
      {!compact && previews > 0 && (
      <ul className="grid grid-cols-3 gap-2" aria-label={`${title}: sample previews`}>
        {samples.slice(0, previews).map((p, i) => (
          <li key={p.src}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group block w-full overflow-hidden rounded-lg bg-surface-2 ring-1 ring-line transition hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Open sample: ${p.label}`}
            >
              <img src={p.thumb} alt="" loading="lazy" decoding="async" width={p.width} height={p.height} className="aspect-[4/5] h-auto w-full object-cover object-top transition group-hover:scale-[1.02]" />
            </button>
          </li>
        ))}
      </ul>
      )}
      {compact ? (
        <button type="button" onClick={() => open(0)} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold underline underline-offset-2">
          <Images className="h-4 w-4" aria-hidden /> View Sample Work
        </button>
      ) : (
        <button type="button" onClick={() => open(0)} className="btn-ghost w-full">
          <Images className="h-4 w-4" aria-hidden /> View Sample Work ({count})
        </button>
      )}

      <dialog
        ref={dialog}
        aria-label={`${title} sample work`}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/85"
        onClick={(e) => e.target === dialog.current && close()}
      >
        <div className="safe-top safe-bottom flex h-full flex-col text-white">
          <header className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="text-xs text-white/70">{SAMPLE_LABEL}</p>
            </div>
            <button type="button" onClick={() => setZoomed((z) => !z)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={zoomed ? "Zoom out" : "Zoom in"} aria-pressed={zoomed}>
              {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </button>
            <button type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close gallery" autoFocus>
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className={`relative min-h-0 flex-1 ${zoomed ? "overflow-auto" : "overflow-hidden"}`}>
            <img
              key={s.src}
              src={s.src}
              alt={s.alt}
              width={s.width}
              height={s.height}
              decoding="async"
              onClick={() => setZoomed((z) => !z)}
              className={zoomed ? "mx-auto block w-[200%] max-w-none cursor-zoom-out sm:w-auto sm:max-w-[200%]" : "mx-auto block h-full w-full cursor-zoom-in object-contain px-2"}
            />
            {count > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/55 hover:bg-black/75" aria-label="Previous sample">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/55 hover:bg-black/75" aria-label="Next sample">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          <footer className="space-y-2 px-4 pt-3 pb-4">
            <p className="text-sm font-medium" aria-live="polite">
              <span className="mono text-white/70">
                {index + 1} of {count}
              </span>{" "}
              · {s.label}
            </p>
            {s.caption && <p className="max-w-2xl text-sm text-white/80">Sample caption: {s.caption}</p>}
            <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="All samples">
              {samples.map((p, i) => (
                <li key={p.src} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setZoomed(false);
                    }}
                    aria-label={`Show ${p.label}`}
                    aria-current={i === index ? "true" : undefined}
                    className={`block h-16 w-12 overflow-hidden rounded ring-2 ${i === index ? "ring-gold" : "ring-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={p.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                  </button>
                </li>
              ))}
            </ul>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
