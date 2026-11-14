"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { AddCategoryModal } from "./AddCategoryModal";
import type { Category, Link } from "./types";

type Props = {
  selectedIds: string[];
  categories: Category[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onClear: () => void;
  onMoved: (links: Link[]) => void;
  onCategoryCreated: (category: Category) => void;
};

export function BulkMoveBar({ selectedIds, categories, busy, onBusy, onClear, onMoved, onCategoryCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(categoryId: string | null) {
    if (busy || selectedIds.length === 0) return;
    onBusy(true);
    setError(null);
    const moved: Link[] = [];
    let failed = 0;
    try {
      for (const id of selectedIds) {
        try {
          const response = await fetch(`/api/links/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId }),
          });
          const data = await response.json();
          if (!response.ok || data.link?.id !== id || data.link.categoryId !== categoryId) throw new Error("Move failed");
          moved.push(data.link);
        } catch {
          failed += 1;
        }
      }
      onMoved(moved);
      if (failed) setError(`${moved.length} moved. ${failed} could not be moved and remain selected. Retry or choose another category.`);
      else setOpen(false);
    } finally {
      onBusy(false);
    }
  }

  const buttonClass = "rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-white/20 disabled:opacity-50";
  return (
    <>
      <div className="sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-300 bg-white p-3 shadow-sm dark:border-indigo-500/50 dark:bg-zinc-900">
        <span className="mr-auto text-sm font-semibold" role="status">{selectedIds.length} links selected</span>
        <button type="button" disabled={busy} className={buttonClass} onClick={onClear}>Clear selection</button>
        <button type="button" disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => { setError(null); setOpen(true); }}>Move to category</button>
      </div>
      <Modal open={open && !creating} onClose={() => { if (!busy) setOpen(false); }} title={`Move ${selectedIds.length} links`}>
        <div className="space-y-2">
          {busy && <p role="status" className="text-sm">Moving links…</p>}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="button" disabled={busy} className={`${buttonClass} w-full text-left font-semibold text-indigo-600 dark:text-indigo-300`} onClick={() => setCreating(true)}>+ New category</button>
          <button type="button" disabled={busy} className={`${buttonClass} w-full text-left`} onClick={() => void move(null)}>Uncategorized</button>
          {categories.map(category => <button key={category.id} type="button" disabled={busy} className={`${buttonClass} w-full text-left break-words`} onClick={() => void move(category.id)}>{category.emoji} {category.name}</button>)}
        </div>
      </Modal>
      <AddCategoryModal open={creating} onClose={() => setCreating(false)} categories={categories} onSaved={category => { onCategoryCreated(category); setCreating(false); void move(category.id); }} />
    </>
  );
}
