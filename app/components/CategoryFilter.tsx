"use client";

import { isLightColor, cn } from "@/lib/utils";
import type { Category } from "./types";

type Props = {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
};

export function CategoryFilter({ categories, activeId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-3 py-1 text-sm font-medium border transition-all",
          activeId === null
            ? "border-zinc-400 bg-zinc-200 text-zinc-900 dark:border-white/40 dark:bg-white/10 dark:text-zinc-100"
            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:bg-white/[0.06]",
        )}
      >
        All
      </button>
      {categories.map((cat) => {
        const active = activeId === cat.id;
        const textOnColor = isLightColor(cat.color) ? "#0a0a0a" : "#ffffff";
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(active ? null : cat.id)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium border transition-all flex items-center gap-1.5",
              active
                ? "border-zinc-700 dark:border-white/40"
                : "border-transparent opacity-70 hover:opacity-100",
            )}
            style={{
              backgroundColor: cat.color,
              color: textOnColor,
            }}
          >
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
