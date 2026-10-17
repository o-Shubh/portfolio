"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

// Chrome / Android fire this event when the site can be installed
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const KEY = "install-prompt-dismissed-at";
const SNOOZE_DAYS = 14;

function snoozed() {
  try {
    const at = Number(localStorage.getItem(KEY));
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 86400000;
  } catch {
    return false;
  }
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iPhone home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIphoneSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Only Safari can add to the home screen on older iOS; other iOS browsers say "CriOS"/"FxiOS"
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/**
 * "Install the app" card.
 * Android/desktop Chrome: a real Install button.
 * iPhone Safari: two-step instructions (Share → Add to Home Screen), since iOS has no install button.
 * Hidden once installed, and for 14 days after "Not now".
 */
export function InstallPrompt({ aboveTabBar = false }: { aboveTabBar?: boolean }) {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || snoozed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault(); // we show our own card instead of the browser's mini-bar
      setEvent(e as InstallEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const installed = () => setMode(null);
    window.addEventListener("appinstalled", installed);
    // Give iPhone visitors a moment on the page before suggesting it
    const t = isIphoneSafari() ? window.setTimeout(() => setMode("ios"), 4000) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", installed);
      window.clearTimeout(t);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    setMode(null);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    setMode(null);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className={`safe-bottom fixed inset-x-0 z-40 px-3 md:right-4 md:left-auto md:w-96 ${aboveTabBar ? "bottom-20 md:bottom-4" : "bottom-3"}`}
    >
      <div className="rounded-xl bg-surface p-4 shadow-lift ring-1 ring-line">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the app icon itself */}
          <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p id="install-title" className="font-medium">
              Get the Eliphas app
            </p>
            <p className="text-sm text-muted">
              {mode === "android"
                ? "Install it on your phone. It opens full-screen, like any app, and takes almost no space."
                : "Add it to your Home Screen to open it like an app:"}
            </p>
          </div>
          <button type="button" onClick={dismiss} className="-mt-1 -mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "ios" ? (
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span className="font-semibold">1.</span> Tap <Share className="h-4 w-4" aria-label="Share" /> <span className="font-semibold">Share</span> in Safari&apos;s toolbar
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span className="font-semibold">2.</span> Choose <SquarePlus className="h-4 w-4" aria-hidden /> <span className="font-semibold">Add to Home Screen</span>
            </li>
          </ol>
        ) : (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={install} className="btn-accent min-h-11 flex-1">
              <Download className="h-4 w-4" aria-hidden /> Install app
            </button>
            <button type="button" onClick={dismiss} className="btn-ghost min-h-11">
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
