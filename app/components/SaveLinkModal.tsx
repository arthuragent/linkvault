"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Modal } from "./Modal";
import { isValidUrl } from "@/lib/utils";
import type { Category, Link } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  initialUrl?: string;
  initialTitle?: string;
  editLink?: Link;
  onSaved: (link: Link) => void;
};

export function SaveLinkModal({
  open,
  onClose,
  categories,
  initialUrl = "",
  initialTitle = "",
  editLink,
  onSaved,
}: Props) {
  const isEdit = Boolean(editLink);
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [categoryId, setCategoryId] = useState<string>("");
  const [metaImage, setMetaImage] = useState<string>("");
  const [aiSummarize, setAiSummarize] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editLink) {
        setUrl(editLink.url);
        setTitle(editLink.title);
        setCategoryId(editLink.categoryId ?? "");
        setMetaImage(editLink.metaImage ?? "");
      } else {
        setUrl(initialUrl);
        setTitle(initialTitle);
        setCategoryId("");
        setMetaImage("");
      }
      setAiSummarize(false);
      setError(null);
    }
  }, [open, initialUrl, initialTitle, editLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidUrl(url)) {
      setError("Please enter a valid http(s) URL");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      let summary: string | null = editLink?.summary ?? null;
      if (!isEdit && aiSummarize) {
        try {
          const res = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (res.ok) {
            const data = await res.json();
            summary = data.summary ?? null;
          }
        } catch {
          // Save without summary if AI fails
        }
      }

      const payload = {
        url,
        title,
        summary,
        metaImage: metaImage.trim() ? metaImage.trim() : null,
        categoryId: categoryId || null,
      };

      const res = await fetch(
        isEdit ? `/api/links/${editLink!.id}` : "/api/links",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save link");
      }
      const data = await res.json();
      onSaved(data.link);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit link" : "Save link"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            required
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/60"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            required
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500/60"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            OG image <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="url"
            value={metaImage}
            onChange={(e) => setMetaImage(e.target.value)}
            placeholder="OG Image URL (optional)"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500/60"
          />
        </div>

        {!isEdit && (
          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 cursor-pointer hover:bg-white/[0.04]">
            <input
              type="checkbox"
              checked={aiSummarize}
              onChange={(e) => setAiSummarize(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-indigo-500"
            />
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-sm text-zinc-200">Generate AI summary</span>
          </label>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

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
            {isEdit ? "Save changes" : "Save link"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
