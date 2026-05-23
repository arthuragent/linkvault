"use client";

import { Plus } from "lucide-react";

type Props = {
  onClick: () => void;
};

export function FloatingActionButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95"
      aria-label="Save new link"
    >
      <Plus className="h-7 w-7" />
    </button>
  );
}
