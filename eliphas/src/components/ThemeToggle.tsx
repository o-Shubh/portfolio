"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "Theme: device", light: "Theme: light", dark: "Theme: dark" };

const listeners = new Set<() => void>();
function read(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Cycles device → light → dark. The choice is remembered on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  function next() {
    const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {}
    listeners.forEach((fn) => fn());
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={next}
      className="grid h-11 w-11 place-items-center rounded-xl text-fg hover:bg-surface-2"
      aria-label={`${LABEL[theme]}. Tap to change.`}
      title={LABEL[theme]}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
