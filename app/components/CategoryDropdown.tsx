"use client";

import type { Category } from "./types";

type Props = {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
};

export function CategoryDropdown({ categories, activeId, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="category-filter" className="text-sm text-zinc-500 shrink-0">
        Filter:
      </label>
      <select
        id="category-filter"
        value={activeId ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/60"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji ? `${c.emoji} ` : ""}
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
