"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import type { Category } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onSaved: (cat: Category) => void;
};

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
];

const PRESET_EMOJIS = ["📚", "💼", "🎬", "🎵", "🎮", "🛠️", "🍳", "🧠", "🌱", "✨", "🔥", "📝"];

export function AddCategoryModal({ open, onClose, categories, onSaved }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(
    PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
  );
  const [emoji, setEmoji] = useState<string>("");
  const [parentId, setParentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setEmoji("");
      setParentId("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          emoji: emoji || null,
          parentId: parentId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save category");
      }
      const data = await res.json();
      onSaved(data.category);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Reading list"
            required
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Color</label>
          <div className="grid grid-cols-12 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#ffffff" : "transparent",
                }}
                aria-label={`Pick ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Emoji <span className="text-zinc-500">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() => setEmoji("")}
              className={`h-9 w-9 rounded-lg border text-sm ${
                emoji === "" ? "border-white/60 bg-white/10" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              —
            </button>
            {PRESET_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-9 w-9 rounded-lg border text-lg ${
                  emoji === e ? "border-white/60 bg-white/10" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="Or type your own"
            maxLength={4}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Parent category <span className="text-zinc-500">(optional)</span>
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500/60"
          >
            <option value="">None (top-level)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
