"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowRight, ClipboardPaste } from "lucide-react";
import { isValidUrl } from "@/lib/utils";
import type { Link } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (link: Link) => void;
};

export function QuickAddOverlay({ open, onClose, onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteAvailable, setPasteAvailable] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    // Autofocus on next tick so the transition doesn't steal focus.
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setError(null);
      setSaving(false);
      return;
    }
    // Only expose the paste shortcut if the clipboard API is available.
    setPasteAvailable(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.readText === "function",
    );
  }, [open]);

  async function handlePaste() {
    try {
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
      onSaved(data.link);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 transition-opacity ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-zinc-900/30 dark:bg-black/50 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl"
      >
        <div className="group flex items-stretch overflow-hidden rounded-full border border-zinc-300/60 dark:border-white/15 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
          {pasteAvailable && (
            <button
              type="button"
              onClick={handlePaste}
              disabled={saving}
              aria-label="Paste from clipboard"
              className="flex shrink-0 items-center justify-center pl-5 pr-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
            >
              <ClipboardPaste className="h-5 w-5" />
            </button>
          )}
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link to save…"
            disabled={saving}
            className={`flex-1 bg-transparent ${
              pasteAvailable ? "pl-2 pr-6" : "px-6"
            } py-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 outline-none disabled:opacity-50`}
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
        {error && (
          <p className="mt-3 text-center text-sm text-red-300 dark:text-red-400 drop-shadow">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
