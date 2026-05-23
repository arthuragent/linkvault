"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, FolderPlus, RefreshCw } from "lucide-react";
import { Modal } from "./Modal";
import { AddCategoryModal } from "./AddCategoryModal";
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
  onCategoryCreated?: (cat: Category) => void;
};

type PreviewData = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  summary: string | null;
};

export function SaveLinkModal({
  open,
  onClose,
  categories,
  initialUrl = "",
  initialTitle = "",
  editLink,
  onSaved,
  onCategoryCreated,
}: Props) {
  const isEdit = Boolean(editLink);
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [metaImage, setMetaImage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (editLink) {
        setUrl(editLink.url);
        setTitle(editLink.title);
        setSummary(editLink.summary ?? "");
        setCategoryId(editLink.categoryId ?? "");
        setMetaImage(editLink.metaImage ?? "");
        setPreview(null);
      } else {
        setUrl(initialUrl);
        setTitle(initialTitle);
        setSummary("");
        setCategoryId("");
        setMetaImage("");
        setPreview(null);
      }
      setError(null);
    }
  }, [open, initialUrl, initialTitle, editLink]);

  async function fetchPreview(u: string) {
    if (!u || !isValidUrl(u)) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      if (res.ok) {
        const data: PreviewData = await res.json();
        setPreview(data);
        // Always sync title + notes + image to the freshly-fetched preview.
        if (data.title) setTitle(data.title);
        if (data.description) setSummary(data.description);
        if (data.image) setMetaImage(data.image);
      }
    } catch {
      // Silently fail — preview is optional
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleUrlBlur() {
    if (!isEdit && url && isValidUrl(url)) {
      void fetchPreview(url);
    }
  }

  function handleUrlChange(val: string) {
    setUrl(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.includes(".") && val.length > 8) {
      debounceRef.current = setTimeout(() => {
        if (!isEdit && isValidUrl(val)) void fetchPreview(val);
      }, 1200);
    }
  }

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
      const payload = {
        url,
        title,
        summary: summary.trim() || null,
        metaImage: metaImage.trim() || null,
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

  function handleCategoryCreated(cat: Category) {
    onCategoryCreated?.(cat);
    setCategoryId(cat.id);
    setAddCategoryOpen(false);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-indigo-500/60";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEdit ? "Edit link" : "Save link"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">URL</label>
              <button
                type="button"
                onClick={() => {
                  if (isValidUrl(url)) void fetchPreview(url);
                }}
                disabled={loadingPreview || !isValidUrl(url)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingPreview ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refetch
              </button>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://…"
              required
              className={inputClass}
              autoFocus
            />
          </div>

          {(loadingPreview || preview) && (
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.02] overflow-hidden">
              {loadingPreview ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching preview…
                </div>
              ) : preview?.image || preview?.title || preview?.description ? (
                <div className="flex gap-3 p-3">
                  {preview.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.image}
                      alt=""
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.03]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {preview.siteName && (
                      <p className="text-xs text-zinc-500 mb-0.5 truncate">{preview.siteName}</p>
                    )}
                    {preview.title && (
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{preview.title}</p>
                    )}
                    {preview.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">{preview.description}</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Notes <span className="text-zinc-400 dark:text-zinc-500">(optional)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Auto-filled from page description…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>Category</label>
              <button
                type="button"
                onClick={() => setAddCategoryOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                New category
              </button>
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
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

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
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

      <AddCategoryModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        categories={categories}
        onSaved={handleCategoryCreated}
      />
    </>
  );
}
