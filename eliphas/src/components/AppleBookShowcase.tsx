"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BookOpen, Check, Feather, Languages, Layers, Printer, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";

// Only a mouse or trackpad tilts the book; touch screens keep it still
const FINE = "(hover: hover) and (pointer: fine)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(FINE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export type ShowcaseEdition = { slug: string; label: string; price: string };
export type ShowcaseBook = {
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  authorHref: string | null;
  description: string | null;
  language: string;
  meta: string;
  pages: number | null;
  sample: boolean;
  /** Real print specifications of this edition, from the book's own settings */
  specs: { paper: string; binding: string; interior: string; size: string };
};

/**
 * Homepage stage for the newest book: a dark "product stage" with the real cover tilting toward the pointer,
 * real price and editions, and a bento grid of how the book is actually made. All content is the book's own data.
 * The tilt only runs with a mouse and never for people who ask for reduced motion.
 */
export default function AppleBookShowcase({
  book,
  editions,
  cover,
  signup,
}: {
  book: ShowcaseBook;
  /** This book plus any other published editions of the same work (e.g. hardcover) */
  editions: ShowcaseEdition[];
  /** The real cover (<BookCover />) */
  cover: React.ReactNode;
  /** Optional line under the hero (e.g. sign-up for visitors) */
  signup?: React.ReactNode;
}) {
  const [selected, setSelected] = useState(editions.find((e) => e.slug === book.slug) ?? editions[0]);
  const [copied, setCopied] = useState(false);
  const tilt = useSyncExternalStore(subscribe, () => window.matchMedia(FINE).matches, () => false);
  const reduce = useReducedMotion();

  // Tilt physics: springs follow the pointer, gently
  const stage = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spring = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), spring);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-14, 14]), spring);
  const sheen = useTransform(mouseX, [-0.5, 0.5], ["-30%", "30%"]);

  const active = tilt && !reduce;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const share = async () => {
    const url = `${window.location.origin}/books/${selected.slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: book.title, url });
        return;
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <section aria-labelledby="stage-h" className="relative overflow-hidden bg-[#0A0A0C] py-20 text-neutral-100 selection:bg-neutral-700 selection:text-white sm:py-28">
      {/* Soft ambient light behind the stage */}
      <div aria-hidden className="pointer-events-none absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-indigo-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* ---------- Headline ---------- */}
        <div className="mb-16 max-w-3xl sm:mb-20">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1.5 text-xs font-medium tracking-wide text-amber-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> New in the bookstore
          </p>
          <h1 id="stage-h" className="text-4xl leading-[1.08] font-semibold tracking-[-0.04em] text-neutral-100 sm:text-6xl">
            Literature, engineered for the senses.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed tracking-tight text-neutral-400 sm:text-xl">
            Independent Hindi and English titles. Never warehoused in bulk. Printed and bound the moment you order.
          </p>
          {signup}
        </div>

        {/* ---------- The book on its stage ---------- */}
        <div className="mb-28 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div ref={stage} onPointerMove={move} onPointerLeave={leave} className="perspective-1000 flex items-center justify-center py-6 lg:col-span-7">
            <motion.div style={active ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined} className="relative w-[240px] sm:w-[300px]">
              {/* Floor shadow */}
              <div aria-hidden className="pointer-events-none absolute inset-x-4 -bottom-8 h-16 rounded-[50%] bg-black/80 opacity-70 blur-2xl" />
              <Link href={`/books/${book.slug}`} aria-label={`${book.title} by ${book.author}`} className="relative block overflow-hidden rounded-[8px] shadow-[0_30px_60px_-12px_rgb(0_0_0/0.8)] ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-amber-300">
                <div className="[&_*]:!shadow-none">{cover}</div>
                {/* Page block on the fore-edge and a moving sheen */}
                <span aria-hidden className="pointer-events-none absolute inset-y-[1.5%] right-0 w-[5px] bg-[repeating-linear-gradient(90deg,#efe7d4_0_1px,#d9cfb8_1px_2px)] opacity-80" />
                {active && <motion.span aria-hidden style={{ x: sheen }} className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.12] to-transparent" />}
              </Link>
            </motion.div>
          </div>

          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="mb-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase">Featured title</p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl" lang={book.language}>
              <Link href={`/books/${book.slug}`} className="hover:underline hover:underline-offset-4">
                {book.title}
              </Link>
            </h2>
            <p className="mt-1 text-base text-neutral-400">
              By{" "}
              {book.authorHref ? (
                <Link href={book.authorHref} className="text-neutral-200 hover:underline">
                  {book.author}
                </Link>
              ) : (
                <span className="text-neutral-200">{book.author}</span>
              )}{" "}
              · {book.meta}
            </p>
            {book.subtitle && (
              <p className="mt-6 text-base leading-relaxed text-neutral-300 sm:text-lg" lang={book.language}>
                &ldquo;{book.subtitle}&rdquo;
              </p>
            )}
            {book.description && (
              <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-neutral-400" lang={book.language}>
                {book.description}
              </p>
            )}

            {/* Edition selector: only real, published editions */}
            <div className="mt-8">
              <p className="mb-2 text-xs font-medium tracking-wider text-neutral-400 uppercase" id="edition-label">
                {editions.length > 1 ? "Select edition" : "Edition"}
              </p>
              <div role={editions.length > 1 ? "radiogroup" : undefined} aria-labelledby="edition-label" className="flex w-fit flex-wrap rounded-full border border-neutral-800 bg-neutral-900 p-1">
                {editions.map((e) => {
                  const on = e.slug === selected.slug;
                  return editions.length > 1 ? (
                    <button
                      key={e.slug}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSelected(e)}
                      className={`min-h-11 rounded-full px-4 text-xs font-medium transition-all motion-reduce:transition-none pointer-fine:min-h-8 ${on ? "bg-neutral-100 text-neutral-900 shadow-md" : "text-neutral-400 hover:text-white"}`}
                    >
                      {e.label}
                    </button>
                  ) : (
                    <span key={e.slug} className="rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-medium text-neutral-900">
                      {e.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Price and actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-8">
              <div aria-live="polite">
                <span className="text-3xl font-semibold tracking-tight text-white tabular-nums">{selected.price}</span>
                <span className="block text-[11px] text-neutral-400">Inclusive of all taxes · shipping shown at checkout</span>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/checkout/${selected.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-black shadow-lg transition-transform hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-95 motion-reduce:transition-none">
                  Buy now <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <button type="button" onClick={share} aria-label={copied ? "Link copied" : "Share this book"} className="grid h-11 w-11 place-items-center rounded-full border border-neutral-800 text-neutral-300 transition-colors hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-amber-300">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {book.sample && (
                <Link href={`/books/${book.slug}/sample`} className="inline-flex min-h-11 items-center gap-1.5 text-neutral-300 hover:text-white md:min-h-0">
                  <BookOpen className="h-4 w-4" aria-hidden /> Read a sample
                </Link>
              )}
              <Link href={`/books/${selected.slug}`} className="inline-flex min-h-11 items-center text-neutral-300 hover:text-white md:min-h-0">
                Book details
              </Link>
            </div>
          </div>
        </div>

        {/* ---------- How the book is made (this edition's real specifications) ---------- */}
        <div className="border-t border-neutral-800 pt-16">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs tracking-widest text-neutral-400 uppercase">How it&apos;s made</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">The architecture of an Eliphas book.</h3>
            <p className="mt-2 text-sm text-neutral-400 sm:text-base">Each copy is printed for its reader, to the specifications the author chose for the edition.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Bento wide icon={Feather} tone="amber" label="Paper" title={book.specs.paper}>
              The paper the author chose for {book.title}. {book.specs.interior} interior{book.pages ? `, ${book.pages} pages` : ""}.
            </Bento>
            <Bento icon={Printer} tone="indigo" label="No warehouse stock" title="Printed when you order">
              Your copy is printed, bound and packed after you check out, then shipped to your door.
            </Bento>
            <Bento icon={Layers} tone="rose" label="Binding" title={book.specs.binding}>
              Trim size {book.specs.size}. Covers and pages are checked by our team before a book goes live.
            </Bento>
            <Bento wide icon={Languages} tone="teal" label="Two languages" title="Hindi and English">
              Independent voices in both languages.{" "}
              <Link href="/books?lang=hi" className="text-neutral-200 underline-offset-2 hover:underline">
                Hindi books
              </Link>{" "}
              ·{" "}
              <Link href="/books?lang=en" className="text-neutral-200 underline-offset-2 hover:underline">
                English books
              </Link>
            </Bento>
          </div>
        </div>
      </div>
    </section>
  );
}

const TONES = {
  amber: "bg-amber-400/10 border-amber-400/20 text-amber-300",
  indigo: "bg-indigo-400/10 border-indigo-400/20 text-indigo-300",
  rose: "bg-rose-400/10 border-rose-400/20 text-rose-300",
  teal: "bg-teal-400/10 border-teal-400/20 text-teal-300",
};

function Bento({
  icon: Icon,
  tone,
  label,
  title,
  wide = false,
  watermark,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: keyof typeof TONES;
  label: string;
  title: string;
  wide?: boolean;
  watermark?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-900/50 p-8 backdrop-blur-sm transition-colors hover:border-neutral-700 ${wide ? "sm:p-10 md:col-span-2" : ""}`}>
      <div className="relative z-10 max-w-md">
        <div className={`mb-6 flex h-10 w-10 items-center justify-center rounded-2xl border ${TONES[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-xs tracking-widest text-neutral-400 uppercase">{label}</p>
        <h4 className={`mt-1 font-semibold tracking-tight text-white ${wide ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>{title}</h4>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">{children}</p>
      </div>
      {watermark && (
        <div aria-hidden className="pointer-events-none absolute right-8 bottom-4 font-serif text-6xl text-neutral-800/40 select-none">
          {watermark}
        </div>
      )}
    </div>
  );
}
