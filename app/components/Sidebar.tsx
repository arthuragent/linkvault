"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Bookmark, FolderPlus } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";

type Props = {
  open: boolean;
  onClose: () => void;
  onNewCategory: () => void;
};

export function Sidebar({ open, onClose, onNewCategory }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <ThemeSwitcher />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Actions
            </p>
            <button
              onClick={() => {
                onClose();
                onNewCategory();
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            >
              <FolderPlus className="h-4 w-4" />
              New category
            </button>
            <Link
              href="/bookmarklet"
              onClick={onClose}
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            >
              <Bookmark className="h-4 w-4" />
              Bookmarklet
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
