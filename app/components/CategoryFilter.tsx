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
            ? "border-white/40 bg-white/10 text-zinc-100"
            : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06]",
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
                ? "border-white/40"
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
