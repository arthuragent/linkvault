"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ArrowRight, ClipboardPaste } from "lucide-react";
import { isValidUrl } from "@/lib/utils";
import { useModalBackButton } from "./useModalBackButton";
import type { Category, Link } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (link: Link) => void;
  categories: Category[];
};

function categoryLabel(category: Category) {
  return `${category.emoji ? `${category.emoji} ` : ""}${category.name}`;
}

function scoreCategory(category: Category, link: Link) {
  const haystack = `${link.title} ${link.url} ${link.summary ?? ""}`.toLowerCase();
  const categoryName = category.name.toLowerCase();
  let score = 0;

  if (haystack.includes(categoryName)) score += 4;
  for (const token of categoryName.split(/\s+/).filter((part) => part.length > 2)) {
    if (haystack.includes(token)) score += 1;
  }

  return score;
}

export function QuickAddOverlay({ open, onClose, onSaved, categories }: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigningCategoryId, setAssigningCategoryId] = useState<string | null>(null);
  const [savedLink, setSavedLink] = useState<Link | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const categoryStepRef = useRef<HTMLDivElement | null>(null);
  const assignAbortRef = useRef<AbortController | null>(null);
  const saveGenerationRef = useRef(0);

  const resetAndClose = useCallback(() => {
    saveGenerationRef.current += 1;
    assignAbortRef.current?.abort();
    assignAbortRef.current = null;
    setUrl("");
    setError(null);
    setSaving(false);
    setAssigningCategoryId(null);
    setSavedLink(null);
    onClose();
  }, [onClose]);

  useModalBackButton(open, resetAndClose);

  const suggestedCategories = useMemo(() => {
    if (!savedLink) return categories;

    return [...categories].sort((a, b) => {
      const scoreDelta = scoreCategory(b, savedLink) - scoreCategory(a, savedLink);
      if (scoreDelta !== 0) return scoreDelta;
      return a.position - b.position;
    });
  }, [categories, savedLink]);

  useEffect(() => {
    if (!open) {
      saveGenerationRef.current += 1;
      assignAbortRef.current?.abort();
      assignAbortRef.current = null;
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetAndClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, resetAndClose]);

  useEffect(() => {
    if (!open) return;
    // Autofocus on next tick so the transition doesn't steal focus.
    const t = setTimeout(() => {
      if (savedLink) {
        categoryStepRef.current
          ?.querySelector<HTMLElement>("button[data-quick-add-focus]")
          ?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [open, savedLink]);

  async function handlePaste() {
    try {
      if (typeof navigator.clipboard?.readText !== "function") {
        setError("Clipboard access unavailable — paste with Ctrl/Cmd+V");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      setError("Clipboard access denied — paste with Ctrl/Cmd+V");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      setError("Please paste a valid http(s) URL");
      return;
    }
    setSaving(true);
    const saveGeneration = saveGenerationRef.current;
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
        // preview optional
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
      if (saveGeneration !== saveGenerationRef.current) return;
      const uncategorizedLink = { ...data.link, categoryId: null };
      onSaved(uncategorizedLink);
      setSavedLink(uncategorizedLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignCategory(categoryId: string) {
    if (!savedLink || assigningCategoryId !== null) return;

    assignAbortRef.current?.abort();
    const controller = new AbortController();
    assignAbortRef.current = controller;
    const linkId = savedLink.id;

    setError(null);
    setAssigningCategoryId(categoryId);
    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to set category");
      }
      const data = await res.json();
      if (controller.signal.aborted) return;
      assignAbortRef.current = null;
      onSaved(data.link);
      resetAndClose();
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to set category");
      setAssigningCategoryId(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 transition-opacity ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={resetAndClose}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-zinc-900/30 dark:bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl"
      >
        {!savedLink ? (
          <form onSubmit={handleSubmit}>
            <div className="group flex items-stretch overflow-hidden rounded-full border border-zinc-300/60 dark:border-white/15 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
              <button
                type="button"
                onClick={handlePaste}
                disabled={saving}
                aria-label="Paste from clipboard"
                className="flex shrink-0 items-center justify-center pl-5 pr-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
              >
                <ClipboardPaste className="h-5 w-5" />
              </button>
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a link to save…"
                disabled={saving}
                className="flex-1 bg-transparent pl-2 pr-6 py-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 outline-none disabled:opacity-50"
              />
              <div className="w-px self-stretch bg-zinc-300/70 dark:bg-white/15" />
              <button
                type="submit"
                disabled={saving || !url.trim()}
                aria-label="Save link"
                className="group/save flex items-center gap-2 px-5 sm:px-6 text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Save</span>
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5 lv-arrow-nudge transition-transform duration-200 group-hover/save:translate-x-1.5" />
                )}
              </button>
            </div>
          </form>
        ) : (
          <div
            ref={categoryStepRef}
            className="rounded-3xl border border-zinc-300/60 dark:border-white/15 bg-white/90 dark:bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Saved to Uncategorized
              </p>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Move it to a category?
              </h2>
              <p className="mx-auto max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                The video is already saved in Uncategorized. Choose a category to move it, or skip to leave it there.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-4 py-3">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {savedLink.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {savedLink.url}
              </p>
            </div>

            {suggestedCategories.length > 0 ? (
              <div className="mt-5 max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain grid gap-2 sm:grid-cols-2">
                {suggestedCategories.map((category, index) => (
                  <button
                    key={category.id}
                    type="button"
                    data-quick-add-focus={index === 0 ? "" : undefined}
                    onClick={() => void handleAssignCategory(category.id)}
                    disabled={assigningCategoryId !== null}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:border-indigo-400/60 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    <span className="min-w-0 truncate">{categoryLabel(category)}</span>
                    {assigningCategoryId === category.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-500" />
                    ) : (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/70 shadow-sm"
                        style={{ backgroundColor: category.color }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No categories yet — skip for now and create categories later.
              </p>
            )}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                data-quick-add-focus={suggestedCategories.length === 0 ? "" : undefined}
                onClick={resetAndClose}
                disabled={assigningCategoryId !== null}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-50"
              >
                Leave in Uncategorized
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-3 text-center text-sm text-red-300 dark:text-red-400 drop-shadow">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
