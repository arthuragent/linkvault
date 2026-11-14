"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Modal } from "./Modal";
import type { Category } from "./types";

type Props = {
  categories: Category[];
  activeIds: string[];
  onSelect: (ids: string[]) => void;
};

export function CategoryDropdown({ categories, activeIds, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  // Empty ID matches links with no category; an empty selection means all.
  const options = [{ id: "", name: "Uncategorized", emoji: null }, ...categories];
  const selected = options.filter((category) => activeIds.includes(category.id));
  const label = activeIds.length === 0
    ? "All categories"
    : selected.length === 1
      ? selected[0].name
      : `${selected.length} categories selected`;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-sm text-zinc-500 shrink-0">Filter:</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Filter categories: ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-w-0 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:outline-indigo-500"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Filter categories">
        <div role="group" aria-label="Categories to display" className="space-y-1">
          <button
            type="button"
            onClick={() => onSelect([])}
            aria-pressed={activeIds.length === 0}
            className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-left text-sm font-semibold text-indigo-600 dark:border-white/10 dark:text-indigo-300"
          >
            All categories {activeIds.length === 0 ? "✓" : ""}
          </button>
          <p className="pb-2 text-xs text-zinc-500">Select one or more. No selection shows all categories.</p>
          {options.map((category) => (
            <label key={category.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 hover:bg-zinc-100 dark:hover:bg-white/10">
              <input
                type="checkbox"
                checked={activeIds.includes(category.id)}
                onChange={(event) => onSelect(event.target.checked
                  ? [...activeIds, category.id]
                  : activeIds.filter((id) => id !== category.id))}
                className="h-5 w-5 shrink-0 accent-indigo-600"
              />
              <span className="min-w-0 break-words text-sm text-zinc-900 dark:text-zinc-100">
                {category.emoji && `${category.emoji} `}{category.name}
              </span>
            </label>
          ))}
        </div>
        <div className="sticky bottom-0 bg-white pt-3 dark:bg-zinc-950">
          <button type="button" onClick={() => setOpen(false)} className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500">
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
