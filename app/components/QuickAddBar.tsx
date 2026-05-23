"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { isValidUrl } from "@/lib/utils";
import type { Link } from "./types";

type Props = {
  onSaved: (link: Link) => void;
};

export function QuickAddBar({ onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      setError("Please paste a valid http(s) URL");
      return;
    }

    setSaving(true);
    try {
      let title = trimmed;
      let summary: string | null = null;
      let metaImage: string | null = null;
      try {
        const p = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        if (p.ok) {
          const data = await p.json();
          if (data.title) title = data.title;
          if (data.description) summary = data.description;
          if (data.image) metaImage = data.image;
        }
      } catch {
        // Preview is optional — fall back to URL as title.
      }

      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          title,
          summary,
          metaImage,
          categoryId: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save link");
      }
      const data = await res.json();
      onSaved(data.link);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a link to save it…"
          disabled={saving}
          className="flex-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-indigo-500/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Save
        </button>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400 px-1">{error}</p>}
    </form>
  );
}
