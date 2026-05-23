"use client";

import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "system" | "light" | "dark";

function applyMode(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") {
    localStorage.removeItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    localStorage.setItem("theme", mode);
    root.classList.toggle("dark", mode === "dark");
  }
}

function readMode(): Mode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "system";
}

export function ThemeSwitcher() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    setMode(readMode());
  }, []);

  // Keep system mode in sync when OS theme flips.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function choose(next: Mode) {
    applyMode(next);
    setMode(next);
  }

  const options: { value: Mode; label: string; icon: typeof Monitor }[] = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Appearance
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] p-1">
        {options.map(({ value, label, icon: Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs transition-colors",
                active
                  ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-white/5",
              )}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
