"use client";

import { Plus } from "lucide-react";

type Props = {
  onClick: () => void;
};

export function FloatingActionButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 shadow-lg shadow-zinc-400/30 dark:shadow-black/30 backdrop-blur transition-all hover:bg-zinc-100 dark:hover:bg-white/20 hover:scale-105 active:scale-95"
      aria-label="Save new link"
    >
      <Plus className="h-7 w-7 text-zinc-600 dark:text-zinc-400" />
    </button>
  );
}
